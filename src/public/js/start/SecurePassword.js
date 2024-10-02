// Verifica si la contraseña cumple con los criterios básicos de seguridad
function enSecurePassword(contraseña) {
    const longitudMinima = 8;
    const hasUpperCase = /[A-Z]/.test(contraseña);
    const hasLowerCase = /[a-z]/.test(contraseña);
    const hasNumber = /[0-9]/.test(contraseña);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(contraseña);
  
    return (
        contraseña.length >= longitudMinima &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber &&
        hasSpecialChar
    );
  }
  
  // Calcula el nivel de seguridad de la contraseña
  function calculateSecurityPassword(contraseña) {
    let seguridad = 0;
    if (contraseña.length >= 8) seguridad += 10; // Penalización por longitud menor
    if (/[A-Z]/.test(contraseña)) seguridad += 15;
    if (/[a-z]/.test(contraseña)) seguridad += 15;
    if (/[0-9]/.test(contraseña)) seguridad += 15;
    if (/[^A-Za-z0-9]/.test(contraseña)) seguridad += 20;
    if (contraseña.length >= 12) seguridad += 10; // Bonificación por longitud mayor
  
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
        if (seguridad < 40) {
            barraProgreso.classList.add("bg-red-500");
            passwordStrengthText.textContent = "La contraseña es débil";
            passwordStrengthText.className = "text-red-500 text-sm font-semibold";
        } else if (seguridad < 70) {
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
            "La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula, una letra minúscula, un número y un carácter especial."
        );
        return false;
    }
    return true;
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
  