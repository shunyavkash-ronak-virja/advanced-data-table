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