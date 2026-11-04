// ================================
// NICE SELECT JS
// ================================
$(document).ready(function () {
    $("select").niceSelect();
});

// ================================
// GLOBAL MODAL JS
// ================================ 
const modals = document.querySelectorAll(".modal, .sidebar");
if (modals.length) {
    const modalBtns = document.querySelectorAll("[data-modal]");
    const modalCloseBtns = document.querySelectorAll(".modal-close, .sidebar-close");

    const modalOpen = (id) => {
        const modal = document.getElementById(id);

        if (modal) {
            modal.classList.add("active");
            document.body.classList.add("body-hidden");
        }
    };

    const modalClose = (id) => {
        const modal = document.getElementById(id);

        if (modal) {
            modal.classList.remove("active");
            const activeModal = document.querySelector(".modal.active, .sidebar.active");

            if (!activeModal) {
                document.body.classList.remove("body-hidden");
            }
        }
    };

    modalBtns.forEach((button) => {
        button.addEventListener("click", () => {
            modalOpen(button.dataset.modal);
        });
    });

    modalCloseBtns.forEach((button) => {
        button.addEventListener("click", () => {
            const parent = button.closest(".modal, .sidebar");

            if (parent) {
                modalClose(parent.id);
            }
        });
    });

    modals.forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                modalClose(modal.id);
            }
        });
    });
}

// ================================
// TOOLBAR ACTION
// ================================
const actionButtons = document.querySelectorAll(".action-btn");
const dropdowns = document.querySelectorAll("[data-dropdown-content]");

function closeAllDropdowns() {
    dropdowns.forEach((dropdown) => {
        dropdown.classList.remove("show");
    });
}

actionButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
        e.stopPropagation();

        const dropdownType = button.dataset.dropdown;
        const targetDropdown = document.querySelector(`[data-dropdown-content="${dropdownType}"]`);

        if (!targetDropdown) return;
        const isOpen = targetDropdown.classList.contains("show");
        closeAllDropdowns();

        if (!isOpen) {
            targetDropdown.classList.add("show");
        }
    });
});

document.addEventListener("click", (e) => {
    if (e.target.closest(".filters-close")) {
        closeAllDropdowns();
        return;
    }

    if (e.target.classList.contains("filters-dropdown")) {
        closeAllDropdowns();
        return;
    }

    if (e.target.closest("[data-dropdown-content]")) {
        return;
    }

    if (e.target.closest(".action-btn")) {
        return;
    }

    closeAllDropdowns();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAllDropdowns();
    }
});