// Verifica si la contraseña cumple con los criterios básicos de seguridad
function enSecurePassword(contraseña) {
    const longitudMinima = 6; // Nueva longitud mínima
    const hasUpperCase = /[A-Z]/.test(contraseña);
    const hasLowerCase = /[a-z]/.test(contraseña);
    const hasNumber = /[0-9]/.test(contraseña);
  
    return (
        contraseña.length >= longitudMinima &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber
    );
}

// Calcula el nivel de seguridad de la contraseña
function calculateSecurityPassword(contraseña) {
    let seguridad = 0;
    if (contraseña.length >= 6) seguridad += 15; // Ajuste por longitud menor
    if (/[A-Z]/.test(contraseña)) seguridad += 15;
    if (/[a-z]/.test(contraseña)) seguridad += 15;
    if (/[0-9]/.test(contraseña)) seguridad += 15;
    if (contraseña.length >= 10) seguridad += 20; // Bonificación por longitud mayor

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
        if (seguridad < 30) {
            barraProgreso.classList.add("bg-red-500");
            passwordStrengthText.textContent = "La contraseña es débil";
            passwordStrengthText.className = "text-red-500 text-sm font-semibold";
        } else if (seguridad < 60) {
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
            "La contraseña debe tener al menos 6 caracteres, incluir al menos una letra mayúscula, una letra minúscula y un número."
        );
        return false;
    }
    return true;
}

function generatePassword() {
    const length = 12; // Aumenta la longitud para mayor seguridad
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?/";
    let password = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array); // Genera valores aleatorios de forma segura

    for (let i = 0; i < length; i++) {
        password += charset.charAt(array[i] % charset.length); // Selecciona caracteres aleatorios
    }

    // Verifica que la contraseña contenga al menos un carácter de cada tipo
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+{}[\]|:;<>,.?/]/.test(password)) {
        return generatePassword(); // Vuelve a generar si no cumple con los requisitos
    }

    document.getElementById("password").value = password;
    updateProgressBar(); // Actualiza la barra de progreso para la nueva contraseña
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
