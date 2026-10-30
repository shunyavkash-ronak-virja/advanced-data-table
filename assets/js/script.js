// ================================
// NICE SELECT JS
// ================================
$(document).ready(function () {
    $("select").niceSelect();
});

// ================================
// GLOBAL MODAL JS
// ================================
const modal = document.querySelectorAll(".modal");
if (modal) {
    const modalBtns = document.querySelectorAll("[data-modal]");
    const modalCloseBtns = document.querySelectorAll(".modal-close");
    const modal = document.querySelectorAll(".modal");

    modalBtns.forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.dataset.modal;
            modalOpen(id);
        });
    });


    modalCloseBtns.forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.closest(".modal").id;
            modalClose(id);
        });
    });

    modal.forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target.classList.contains("modal")) {
                const id = modal.id;
                modalClose(id);
            }
        });
    });

    const modalOpen = (id) => {
        const modal = document.querySelector(`#${id}`);
        if (modal) modal.classList.add("active");
        document.body.classList.add("body-hidden");
    };

    const modalClose = (id) => {
        const modal = document.querySelector(`#${id}`);
        if (modal) modal.classList.remove("active");
        document.body.classList.remove("body-hidden");
    };
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