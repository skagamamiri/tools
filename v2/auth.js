// ============================================================
// Hub Tool ICT v2
// auth.js
// Google Authentication + Teacher Access Control
// ============================================================

import {
    auth,
    db,
    provider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp
} from "./firebase.js";

// ============================================================
// CONFIGURATION
// ============================================================

// Domain rasmi akaun DELIMa
const ALLOWED_DOMAIN = "@moe-dl.edu.my";

// Nama collection guru dalam Firestore
const TEACHERS_COLLECTION = "teachers";

// Nama collection log login
const LOGIN_LOG_COLLECTION = "loginLogs";

// Current Firebase user
let currentTeacher = null;

// ============================================================
// PUBLIC STATE
// ============================================================

window.currentTeacher = null;

// ============================================================
// INITIALIZE AUTH
// ============================================================

export function initAuth() {

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            currentTeacher = null;
            window.currentTeacher = null;

            updateTeacherHeader(null);
            updateLoginState(false);

            return;
        }

        try {

            const teacher = await validateTeacher(user);

            if (!teacher.allowed) {

                await signOut(auth);

                currentTeacher = null;
                window.currentTeacher = null;

                updateTeacherHeader(null);
                updateLoginState(false);

                showAuthError(
                    "Akses Ditolak",
                    teacher.message || "Akaun anda tidak dibenarkan menggunakan Hub Tool ICT."
                );

                return;
            }

            // ------------------------------------------------
            // Login berjaya
            // ------------------------------------------------

            currentTeacher = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || "Guru",
                photoURL: user.photoURL || "",
                role: teacher.role || "teacher",
                active: true
            };

            window.currentTeacher = currentTeacher;

            updateTeacherHeader(currentTeacher);
            updateLoginState(true);

            // Rekod login
            await recordLogin(currentTeacher);

            showToast(
                `Selamat datang, ${currentTeacher.displayName}!`,
                "success"
            );

        } catch (error) {

            console.error("Firebase Auth Error:", error);

            await signOut(auth);

            currentTeacher = null;
            window.currentTeacher = null;

            updateTeacherHeader(null);
            updateLoginState(false);

            showAuthError(
                "Ralat Log Masuk",
                "Tidak dapat mengesahkan akaun. Sila cuba lagi."
            );
        }

    });
}

// ============================================================
// GOOGLE LOGIN
// ============================================================

export async function loginWithGoogle() {

    try {

        showLoginLoading(true);

        provider.setCustomParameters({
            prompt: "select_account"
        });

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        // ----------------------------------------------------
        // Semakan asas domain
        // ----------------------------------------------------

        if (!isAllowedDomain(user.email)) {

            await signOut(auth);

            showAuthError(
                "Akaun Tidak Dibenarkan",
                "Sila gunakan akaun Google DELIMa sekolah."
            );

            return null;
        }

        // onAuthStateChanged akan buat semakan Firestore
        return user;

    } catch (error) {

        console.error("Google Login Error:", error);

        if (error.code === "auth/popup-closed-by-user") {

            showToast(
                "Log masuk dibatalkan.",
                "info"
            );

        } else if (error.code === "auth/popup-blocked") {

            showAuthError(
                "Popup Disekat",
                "Sila benarkan popup untuk laman Hub Tool ICT ini."
            );

        } else {

            showAuthError(
                "Google Login Gagal",
                getFirebaseErrorMessage(error)
            );
        }

        return null;

    } finally {

        showLoginLoading(false);

    }
}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutTeacher() {

    try {

        await signOut(auth);

        currentTeacher = null;
        window.currentTeacher = null;

        updateTeacherHeader(null);
        updateLoginState(false);

        showToast(
            "Anda telah log keluar.",
            "info"
        );

    } catch (error) {

        console.error("Logout Error:", error);

        showToast(
            "Gagal log keluar. Sila cuba lagi.",
            "error"
        );
    }
}

// ============================================================
// VALIDATE TEACHER
// ============================================================

async function validateTeacher(user) {

    const email = (user.email || "").toLowerCase().trim();

    // --------------------------------------------------------
    // 1. Pastikan email wujud
    // --------------------------------------------------------

    if (!email) {

        return {
            allowed: false,
            message: "Google tidak memberikan alamat email."
        };
    }

    // --------------------------------------------------------
    // 2. Semak Firestore whitelist
    // --------------------------------------------------------

    const teacherRef = doc(
        db,
        TEACHERS_COLLECTION,
        email
    );

    const teacherSnap = await getDoc(teacherRef);

    // Guru belum didaftarkan
    if (!teacherSnap.exists()) {

        return {
            allowed: false,
            message:
                "Akaun anda belum didaftarkan sebagai guru SK Agama (MIS) Miri. Sila hubungi Guru ICT."
        };
    }

    const teacherData = teacherSnap.data();

    // Guru dinyahaktifkan
    if (teacherData.active === false) {

        return {
            allowed: false,
            message:
                "Akaun anda telah dinyahaktifkan. Sila hubungi Guru ICT."
        };
    }

    return {
        allowed: true,
        role: teacherData.role || "teacher",
        data: teacherData
    };
}

// ============================================================
// CHECK DOMAIN
// ============================================================

function isAllowedDomain(email) {
    // Akses sebenar ditentukan oleh teachers/{email} dalam Firestore.
    // Fungsi ini dikekalkan untuk compatibility dengan kod lama.
    return !!String(email || '').trim();
}

// ============================================================
// RECORD LOGIN
// ============================================================

async function recordLogin(teacher) {

    try {

        await addDoc(
            collection(db, LOGIN_LOG_COLLECTION),
            {
                uid: teacher.uid,
                email: teacher.email,
                displayName: teacher.displayName,
                role: teacher.role,
                loginAt: serverTimestamp()
            }
        );

        // Update last login pada dokumen guru
        await setDoc(
            doc(
                db,
                TEACHERS_COLLECTION,
                teacher.email
            ),
            {
                uid: teacher.uid,
                displayName: teacher.displayName,
                photoURL: teacher.photoURL || "",
                lastLoginAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

    } catch (error) {

        // Jangan gagalkan login hanya kerana logging gagal
        console.warn(
            "Login log gagal direkod:",
            error
        );
    }
}

// ============================================================
// HEADER USER INTERFACE
// ============================================================

function updateTeacherHeader(teacher) {

    const container =
        document.getElementById("teacherAuthContainer");

    if (!container) return;

    // --------------------------------------------------------
    // LOGGED OUT
    // --------------------------------------------------------

    if (!teacher) {

        container.innerHTML = `
            <button
                id="googleLoginBtn"
                onclick="loginWithGoogle()"
                class="px-3 py-2 rounded-xl
                       bg-white dark:bg-slate-800
                       border border-slate-200
                       dark:border-slate-700
                       text-slate-700 dark:text-white
                       text-xs font-semibold
                       shadow-sm hover:shadow-md
                       hover:border-brand-500
                       transition
                       flex items-center space-x-2">

                <i class="fa-brands fa-google text-red-500"></i>

                <span class="hidden sm:inline">
                    Login dengan Google
                </span>

            </button>
        `;

        return;
    }

    // --------------------------------------------------------
    // LOGGED IN
    // --------------------------------------------------------

    const photo = teacher.photoURL
        ? `
            <img
                src="${escapeHtml(teacher.photoURL)}"
                alt="Profil"
                class="w-7 h-7 rounded-full object-cover border border-white shadow-sm"
            >
          `
        : `
            <div class="w-7 h-7 rounded-full
                        bg-brand-600 text-white
                        flex items-center justify-center
                        text-[10px] font-bold">

                ${escapeHtml(
                    getInitials(teacher.displayName)
                )}

            </div>
          `;

    const roleBadge =
        teacher.role === "admin"
            ? `
                <span class="text-[9px]
                             px-1.5 py-0.5
                             rounded-md
                             bg-amber-500/10
                             text-amber-600
                             dark:text-amber-400
                             font-bold">
                    ADMIN
                </span>
              `
            : "";

    container.innerHTML = `
        <div class="flex items-center
                    space-x-1.5
                    bg-emerald-500/10
                    border border-emerald-500/20
                    px-2 py-1
                    rounded-xl">

            ${photo}

            <div class="hidden md:block
                        max-w-[130px]
                        leading-tight">

                <div class="flex items-center gap-1">

                    <span
                        class="text-[11px]
                               text-emerald-700
                               dark:text-emerald-400
                               font-bold
                               truncate">

                        ${escapeHtml(
                            teacher.displayName
                        )}

                    </span>

                    ${roleBadge}

                </div>

                <div
                    class="text-[9px]
                           text-slate-400
                           truncate"
                    title="${escapeHtml(teacher.email)}">

                    ${escapeHtml(teacher.email)}

                </div>

            </div>

            <button
                onclick="logoutTeacher()"
                class="ml-1
                       p-1.5
                       text-slate-400
                       hover:text-rose-500
                       transition"
                title="Log Keluar">

                <i class="fa-solid
                          fa-right-from-bracket
                          text-xs">
                </i>

            </button>

        </div>
    `;
}

// ============================================================
// UPDATE LOGIN STATE
// ============================================================

function updateLoginState(isLoggedIn) {

    document.body.dataset.loggedIn =
        isLoggedIn ? "true" : "false";

    // Event untuk module lain
    window.dispatchEvent(
        new CustomEvent(
            "teacherAuthChanged",
            {
                detail: {
                    loggedIn: isLoggedIn,
                    teacher: currentTeacher
                }
            }
        )
    );
}

// ============================================================
// LOGIN LOADING
// ============================================================

function showLoginLoading(isLoading) {

    const btn =
        document.getElementById("googleLoginBtn");

    if (!btn) return;

    if (isLoading) {

        btn.disabled = true;

        btn.innerHTML = `
            <i class="fa-solid fa-spinner
                      fa-spin text-brand-600">
            </i>

            <span>
                Sedang log masuk...
            </span>
        `;

    } else {

        btn.disabled = false;

        btn.innerHTML = `
            <i class="fa-brands fa-google
                      text-red-500">
            </i>

            <span class="hidden sm:inline">
                Login dengan Google
            </span>
        `;
    }
}

// ============================================================
// ERROR MODAL / ALERT
// ============================================================

function showAuthError(title, message) {

    // Cuba gunakan modal login baharu jika tersedia
    const modal =
        document.getElementById("teacherLoginModal");

    if (modal) {

        modal.classList.remove("hidden");

        const error =
            document.getElementById("loginErrorAlert");

        if (error) {

            error.classList.remove("hidden");

            error.innerHTML = `
                <i class="fa-solid
                          fa-circle-exclamation
                          mr-1.5">
                </i>

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <div class="mt-1 font-normal">
                    ${escapeHtml(message)}
                </div>
            `;
        }
    }

    showToast(
        message,
        "error"
    );
}

// ============================================================
// FIREBASE ERROR MESSAGE
// ============================================================

function getFirebaseErrorMessage(error) {

    const code = error?.code || "";

    const messages = {

        "auth/popup-blocked":
            "Popup Google telah disekat oleh pelayar.",

        "auth/popup-closed-by-user":
            "Popup Google ditutup sebelum proses selesai.",

        "auth/cancelled-popup-request":
            "Permintaan login dibatalkan.",

        "auth/network-request-failed":
            "Masalah rangkaian internet. Sila cuba lagi.",

        "auth/unauthorized-domain":
            "Domain web app belum didaftarkan dalam Firebase Authentication.",

        "auth/operation-not-allowed":
            "Google Sign-In belum diaktifkan dalam Firebase Authentication."

    };

    return messages[code] ||
        "Berlaku masalah ketika log masuk dengan Google.";
}

// ============================================================
// UTILITY
// ============================================================

function getInitials(name) {

    if (!name) return "G";

    const parts =
        name.trim().split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// TOAST COMPATIBILITY
// ============================================================

function showToast(message, type = "info") {

    if (typeof window.showToast === "function") {

        window.showToast(
            message,
            type
        );

        return;
    }

    console.log(
        `[${type.toUpperCase()}] ${message}`
    );
}

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

// Penting:
// index.html anda sekarang menggunakan onclick="..."
// Jadi fungsi module perlu didaftarkan pada window.

window.loginWithGoogle = loginWithGoogle;

window.logoutTeacher = logoutTeacher;

// Fungsi lama dikekalkan sementara supaya
// kod index.html sedia ada tidak rosak.

window.openTeacherLoginModal = function () {

    loginWithGoogle();

};

window.closeTeacherLoginModal = function () {

    const modal =
        document.getElementById("teacherLoginModal");

    if (modal) {
        modal.classList.add("hidden");
    }

};

// ============================================================
// INITIALIZE
// ============================================================

initAuth();

// ============================================================
// EXPORT
// ============================================================

export {
    currentTeacher,
    validateTeacher,
    isAllowedDomain
};
