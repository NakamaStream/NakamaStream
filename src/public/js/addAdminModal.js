function showAddAdminModal() {
    document.getElementById("addAdminModal").style.display = "block";
}

function showUpdateModal(userId, username, email) {
    document.getElementById("updateUserId").value = userId;
    document.getElementById("updateUsername").value = username;
    document.getElementById("updateEmail").value = email;
    document.getElementById("updateModal").style.display = "block";
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}
