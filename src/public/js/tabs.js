// Toggle mobile menu
document.getElementById('mobile-menu-button').addEventListener('click', function() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Toggle FAQ answers
function toggleFAQ(element) {
    const answer = element.nextElementSibling;
    const arrow = element.querySelector('span:last-child');
    answer.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
}
