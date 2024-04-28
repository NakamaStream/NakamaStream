const toggleModeBtn = document.querySelector(".toggle-mode");
const body = document.body;
const box = document.querySelector(".box");
const toggleModeIcon = toggleModeBtn.querySelector("i");
const toggleModeText = toggleModeBtn.querySelector("span");

let isDarkMode = true;

function toggleDarkMode() {
  body.classList.toggle("light-mode");
  box.classList.toggle("light-mode");
  toggleModeIcon.classList.toggle("fa-sun");
  toggleModeIcon.classList.toggle("fa-moon");
  toggleModeText.textContent = isDarkMode ? "Modo claro" : "Modo oscuro";
  isDarkMode = !isDarkMode;
}

toggleModeBtn.addEventListener("click", toggleDarkMode);

// Cargar el modo guardado en el localStorage
if (localStorage.getItem("darkMode") === "false") {
  toggleDarkMode();
}

// Guardar el modo en el localStorage cuando cambia
window.addEventListener("beforeunload", () => {
  localStorage.setItem("darkMode", isDarkMode);
});
