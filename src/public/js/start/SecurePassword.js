// Verifica si la contraseña cumple con los criterios básicos de seguridad
function enSecurePassword(contraseña) {
    const longitudMinima = 4; // Longitud mínima reducida
    const hasLowerCase = /[a-z]/.test(contraseña);
    const hasNumber = /[0-9]/.test(contraseña);

    return (
        contraseña.length >= longitudMinima &&
        hasLowerCase &&
        hasNumber
    );
}

// Calcula el nivel de seguridad de la contraseña
function calculateSecurityPassword(contraseña) {
    let seguridad = 0;
    if (contraseña.length >= 4) seguridad += 25;
    if (/[a-z]/.test(contraseña)) seguridad += 25;
    if (/[0-9]/.test(contraseña)) seguridad += 25;
    if (contraseña.length >= 6) seguridad += 25;

    return seguridad;
}

// Actualiza la barra de progreso en función de la seguridad de la contraseña
function updateProgressBar() {
    const contraseña = document.getElementById("password").value;
    const barraProgreso = document.getElementById("strengthBar");
    const passwordStrengthText = document.getElementById("passwordStrength");
    const seguridad = calculateSecurityPassword(contraseña);

    if (barraProgreso && passwordStrengthText) {
        barraProgreso.value = seguridad;

        // Cambiar el color de la barra de progreso según el nivel de seguridad
        barraProgreso.classList.remove("bg-red-500", "bg-yellow-500", "bg-green-500");
        if (seguridad < 50) {
            barraProgreso.classList.add("bg-red-500");
            passwordStrengthText.textContent = "La contraseña es débil";
            passwordStrengthText.className = "text-red-500 text-sm font-semibold";
        } else if (seguridad < 75) {
            barraProgreso.classList.add("bg-yellow-500");
            passwordStrengthText.textContent = "La contraseña es moderada";
            passwordStrengthText.className = "text-yellow-500 text-sm font-semibold";
        } else {
            barraProgreso.classList.add("bg-green-500");
            passwordStrengthText.textContent = "La contraseña es segura";
            passwordStrengthText.className = "text-green-500 text-sm font-semibold";
        }
    }
}

// Valida el formulario al enviarlo
function validateForm() {
    const contraseña = document.getElementById("password").value;
    if (!enSecurePassword(contraseña)) {
        alert(
            "La contraseña debe tener al menos 4 caracteres, incluir al menos una letra minúscula y un número."
        );
        return false;
    }
    return true;
}

function generatePassword() {
    const length = 6; // Longitud reducida
    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        password += charset.charAt(array[i] % charset.length);
    }

    // Verifica que la contraseña contenga al menos un carácter de cada tipo
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return generatePassword();
    }

    document.getElementById("password").value = password;
    updateProgressBar();
}

// Función para inicializar los event listeners
function initializePasswordValidation() {
    const passwordInput = document.getElementById("password");
    const form = document.querySelector("form");

    if (passwordInput) {
        passwordInput.addEventListener("input", updateProgressBar);
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            if (!validateForm()) {
                event.preventDefault();
            }
        });
    }
}

// Esperar a que el DOM esté completamente cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", initializePasswordValidation);
