document.addEventListener('DOMContentLoaded', () => {
    // 템플릿 변수: 전역 변수로 받아 사용
    const pricePerUnit = window.pricePerUnit;
    const quantityDisplay = document.getElementById('quantity-display');
    const totalPrice = document.getElementById('total-price');

    document.querySelector('.quantity-decrease').addEventListener('click', () => {
        let quantity = parseInt(quantityDisplay.textContent);
        if (quantity > 1) {
            quantity--;
            quantityDisplay.textContent = quantity;
            totalPrice.textContent = (quantity * pricePerUnit).toLocaleString();
        }
    });

    document.querySelector('.quantity-increase').addEventListener('click', () => {
        let quantity = parseInt(quantityDisplay.textContent);
        quantity++;
        quantityDisplay.textContent = quantity;
        totalPrice.textContent = (quantity * pricePerUnit).toLocaleString();
    });
});
