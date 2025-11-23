function requireLoginRedirect() {
  alert('로그인이 필요합니다.');
  window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
}

// fetch 응답 공통 처리 (401 + JSON 파싱)
function handleAuthAndJson(response) {
  if (response.status === 401) {
    requireLoginRedirect();
    return null;
  }
  return response.json();
}

// 숫자 → 통화 포맷
function formatCurrency(value) {
  if (isNaN(value)) value = 0;
  return value.toLocaleString('ko-KR') + '원';
}

// 선택된 상품 기준 합계 계산
function calculateTotals() {
  const checkboxes = document.querySelectorAll('.cart-item-checkbox');
  let total = 0;

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const price = parseInt(checkbox.dataset.price || '0', 10);
      const quantity = parseInt(checkbox.dataset.quantity || '1', 10);
      total += price * quantity;
    }
  });

  const selectedTotalPriceEl = document.getElementById('selectedTotalPrice');
  const finalTotalPriceEl = document.getElementById('finalTotalPrice');

  if (selectedTotalPriceEl) selectedTotalPriceEl.textContent = formatCurrency(total);
  if (finalTotalPriceEl) finalTotalPriceEl.textContent = formatCurrency(total);
}

// 장바구니 배지 업데이트 (헤더 아이콘)
function updateCartBadge(count) {
  const cartBadge = document.getElementById('cartBadge');
  if (!cartBadge) return;

  if (count > 0) {
    cartBadge.textContent = count;
    cartBadge.style.display = 'flex';
  } else {
    cartBadge.style.display = 'none';
  }
}

// 현재 장바구니 개수 서버에서 가져오기
function fetchCartCount() {
  fetch('/cart/check')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.cart_items)) {
        updateCartBadge(data.cart_items.length);
      }
    })
    .catch((err) => console.error('장바구니 개수 조회 오류:', err));
}

// 수량 변경 요청
function requestUpdateQuantity(productId, action) {
  return fetch('/cart/update_quantity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: parseInt(productId, 10),
      action: action,
    }),
  })
    .then(handleAuthAndJson)
    .then((data) => {
      if (!data) return null;
      if (!data.success) {
        alert(data.message || '수량 변경에 실패했습니다.');
        return null;
      }
      return data;
    });
}

// 장바구니 삭제 요청
function requestRemoveItem(productId) {
  return fetch('/cart/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: parseInt(productId, 10),
    }),
  })
    .then(handleAuthAndJson)
    .then((data) => {
      if (!data) return null;
      if (!data.success) {
        alert(data.message || '삭제에 실패했습니다.');
        return null;
      }
      return data;
    });
}

// 하트 아이콘 UI 업데이트
function setHeartFilled(heartIcon, filled) {
  if (!heartIcon) return;

  if (filled) {
    heartIcon.classList.remove('bi-heart');
    heartIcon.classList.add('bi-heart-fill');
    heartIcon.style.color = '#dc3545';
  } else {
    heartIcon.classList.remove('bi-heart-fill');
    heartIcon.classList.add('bi-heart');
    heartIcon.style.color = '#333';
  }
}

// 토스트 메시지
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'position-fixed bottom-0 end-0 p-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show" role="alert">
      <div class="toast-body bg-dark text-white rounded">
        ${message}
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// 현재 장바구니 개수 가져오기
function getCurrentCartCount() {
  const cartBadge = document.getElementById('cartBadge');
  if (cartBadge && cartBadge.style.display !== 'none') {
    return parseInt(cartBadge.textContent);
  }
  return 0;
}

// 응답 데이터 내 redirect 플래그 공통 처리
function handleRedirectFlag(data) {
  if (data && data.redirect) {
    requireLoginRedirect();
    return true;
  }
  return false;
}

// 장바구니에 상품 실시간 추가 (AJAX)
function addToCartRealTime(productId, productData) {
  return fetch('/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: productData.name,
      brand: productData.brand,
      price: productData.price,
      image_url: productData.image_url
    })
  })
  .then(handleAuthAndJson);
}

// 장바구니에서 상품 실시간 제거 (AJAX)
function removeFromCartRealTime(productId) {
  return fetch('/cart/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product_id: productId })
  })
  .then(handleAuthAndJson);
}

// 장바구니에 상품 추가하고 UI 업데이트
function addProductToCartAndUpdateUI(productId, productData) {
  addToCartRealTime(productId, productData)
    .then(data => {
      if (!data) return;

      if (handleRedirectFlag(data)) return;

      if (data.success) {
        // 장바구니 UI에 상품 추가
        addCartItemToUI(productData);
        // 합계 재계산
        calculateTotals();
        // 장바구니 개수 업데이트
        fetchCartCount();
        showToast('장바구니에 추가되었습니다!');
      } else {
        alert('추가에 실패했습니다.');
      }
    })
    .catch(error => {
      console.error('오류:', error);
      alert('오류가 발생했습니다.');
    });
}

// 장바구니 UI에 상품 추가
function addCartItemToUI(productData) {
  const cartSection = document.querySelector('.wishlist-cart-section');
  const emptyCart = cartSection.querySelector('.empty-cart');

  // 빈 장바구니가 있으면 제거
  if (emptyCart) {
    emptyCart.remove();
  }

  // 이미 존재하는 상품인지 확인
  const existingItem = document.querySelector(`#cartItem-${productData.product_id}`);
  if (existingItem) {
    // 이미 존재하면 수량만 증가
    const quantitySpan = existingItem.querySelector('.cart-item-quantity');
    const currentQuantity = parseInt(quantitySpan.textContent);
    quantitySpan.textContent = currentQuantity + 1;

    // 데이터 속성 업데이트
    const checkbox = existingItem.querySelector('.cart-item-checkbox');
    checkbox.dataset.quantity = String(currentQuantity + 1);

    // 가격 업데이트
    const priceEl = existingItem.querySelector('.cart-item-price');
    const unitPrice = parseInt(checkbox.dataset.price || '0', 10);
    priceEl.textContent = formatCurrency(unitPrice * (currentQuantity + 1));

    return;
  }

  // 새로운 장바구니 아이템 생성
  const newCartItem = createCartItemHTML(productData);
  const cartItemsContainer = cartSection.querySelector('.cart-item-row') ?
    cartSection.querySelector('.cart-item-row').parentNode : cartSection;

  // 페이지네이션 전에 추가
  const pagination = cartSection.querySelector('.pagination-wrapper');
  if (pagination) {
    cartItemsContainer.insertBefore(newCartItem, pagination);
  } else {
    cartItemsContainer.appendChild(newCartItem);
  }

  // 새로 추가된 아이템에 이벤트 리스너 연결
  attachEventListenersToNewItem(newCartItem);
}

// 장바구니 아이템 HTML 생성
function createCartItemHTML(productData) {
  const cartItemHTML = `
    <div class="cart-item-row" id="cartItem-${productData.product_id}">
      <div class="cart-item-inner d-flex">
        <!-- 개별 선택 체크박스 -->
        <div class="form-check mt-2 me-3">
          <input
            class="form-check-input cart-item-checkbox"
            type="checkbox"
            value="${productData.product_id}"
            checked
            data-item-id="${productData.product_id}"
            data-product-id="${productData.product_id}"
            data-price="${productData.price || 0}"
            data-quantity="1"
          >
        </div>

        <!-- 상품 이미지 -->
        <div class="cart-item-thumb me-3">
          <a href="/product_detail?product_id=${productData.product_id}">
            <img src="${productData.image_url}" alt="${productData.name}" class="img-fluid">
          </a>
        </div>

        <!-- 상품 정보 -->
        <div class="cart-item-body flex-grow-1">
          <!-- 상단: 브랜드 / 상품명 / 삭제 버튼 -->
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="cart-item-brand">${productData.brand}</div>
              <div class="cart-item-name">${productData.name}</div>
              <div class="cart-item-meta text-muted small mt-1">
                무료배송
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary border-0 cart-item-remove"
              data-product-id="${productData.product_id}"
              aria-label="장바구니에서 삭제"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- 옵션 / 수량 / 가격 -->
          <div class="cart-item-option-row d-flex align-items-center mt-3">
            <div class="flex-grow-1">
              <span class="cart-item-option text-muted small">
                ${productData.style || '기본 옵션'}
              </span>
            </div>

            <!-- 수량 조절 -->
            <div class="cart-item-quantity-control d-flex align-items-center me-3" data-product-id="${productData.product_id}">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm quantity-decrease"
                data-product-id="${productData.product_id}"
              >
                &minus;
              </button>
              <span class="cart-item-quantity mx-2" data-product-id="${productData.product_id}">
                1
              </span>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm quantity-increase"
                data-product-id="${productData.product_id}"
              >
                +
              </button>
            </div>

            <!-- 개별 상품 금액 (수량 반영) -->
            <div class="cart-item-price text-end fw-semibold"
                 data-product-id="${productData.product_id}">
              ${(productData.price || 0).toLocaleString()}원
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cartItemHTML;
  return tempDiv.firstElementChild;
}

// 새로 추가된 아이템에 이벤트 리스너 연결
function attachEventListenersToNewItem(cartItem) {
  const productId = cartItem.querySelector('.cart-item-checkbox').dataset.productId;

  // 체크박스 이벤트
  const checkbox = cartItem.querySelector('.cart-item-checkbox');
  checkbox.addEventListener('change', () => {
    calculateTotals();
    updateSelectAllCheckbox();
  });

  // 수량 증가 버튼
  const increaseBtn = cartItem.querySelector('.quantity-increase');
  increaseBtn.addEventListener('click', () => {
    handleQuantityIncrease(productId);
  });

  // 수량 감소 버튼
  const decreaseBtn = cartItem.querySelector('.quantity-decrease');
  decreaseBtn.addEventListener('click', () => {
    handleQuantityDecrease(productId);
  });

  // 삭제 버튼
  const removeBtn = cartItem.querySelector('.cart-item-remove');
  removeBtn.addEventListener('click', () => {
    handleRemoveItem(productId);
  });
}

// 수량 증가 처리
function handleQuantityIncrease(productId) {
  requestUpdateQuantity(productId, 'increase').then((data) => {
    if (!data) return;

    const quantitySpan = document.querySelector(
      '.cart-item-quantity[data-product-id="' + productId + '"]'
    );
    const priceEl = document.querySelector(
      '.cart-item-price[data-product-id="' + productId + '"]'
    );
    const checkbox = document.querySelector(
      '.cart-item-checkbox[data-product-id="' + productId + '"]'
    );

    if (quantitySpan) {
      quantitySpan.textContent = data.quantity;
    }
    if (checkbox) {
      checkbox.dataset.quantity = String(data.quantity);
    }
    if (priceEl && checkbox) {
      const unitPrice = parseInt(checkbox.dataset.price || '0', 10);
      priceEl.textContent = formatCurrency(unitPrice * data.quantity);
    }

    calculateTotals();
    fetchCartCount();
  });
}

// 수량 감소 처리
function handleQuantityDecrease(productId) {
  const quantitySpan = document.querySelector(
    '.cart-item-quantity[data-product-id="' + productId + '"]'
  );
  const currentQuantity = parseInt(quantitySpan.textContent, 10);

  // 상품 1개에서 수량 빼기 금지
  if (currentQuantity <= 1) {
    return;
  }

  requestUpdateQuantity(productId, 'decrease').then((data) => {
    if (!data) return;

    const priceEl = document.querySelector(
      '.cart-item-price[data-product-id="' + productId + '"]'
    );
    const checkbox = document.querySelector(
      '.cart-item-checkbox[data-product-id="' + productId + '"]'
    );

    if (quantitySpan) {
      quantitySpan.textContent = data.quantity;
    }
    if (checkbox) {
      checkbox.dataset.quantity = String(data.quantity);
    }
    if (priceEl && checkbox) {
      const unitPrice = parseInt(checkbox.dataset.price || '0', 10);
      priceEl.textContent = formatCurrency(unitPrice * data.quantity);
    }

    calculateTotals();
    fetchCartCount();
  });
}

// 상품 삭제 처리
function handleRemoveItem(productId) {
  if (!confirm('이 상품을 장바구니에서 삭제하시겠습니까?')) return;

  requestRemoveItem(productId).then((data) => {
    if (!data) return;

    // UI에서 상품 제거
    removeCartItemFromUI(productId);
    // 최근 본 상품 하트 상태 업데이트
    updateViewedProductHeart(productId, false);
    // 장바구니 개수 업데이트
    fetchCartCount();
  });
}

// 전체 선택 체크박스 상태 업데이트
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAll');
  if (!selectAllCheckbox) return;

  const allCheckboxes = document.querySelectorAll('.cart-item-checkbox');
  const allChecked = Array.from(allCheckboxes).every((c) => c.checked);
  selectAllCheckbox.checked = allChecked;
}

// 최근 본 상품 하트 토글 함수
function toggleWishlist(event, productId) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const heartIcon = button.querySelector('i');
  const isFilled = heartIcon.classList.contains('bi-heart-fill');
  const productCard = button.closest('.card');
  const productData = {
    product_id: productId,
    name: productCard.querySelector('.small.text-truncate').textContent,
    brand: productCard.querySelector('.small.text-muted').textContent,
    price: parseInt(productCard.querySelector('.small.fw-semibold').textContent.replace(/[^0-9]/g, '')),
    image_url: productCard.querySelector('img').src,
    style: '기본 옵션'
  };

  if (isFilled) {
    // 장바구니에서 제거
    removeFromCartRealTime(productId)
      .then(data => {
        if (!data) return;

        if (handleRedirectFlag(data)) return;

        if (data.success) {
          setHeartFilled(heartIcon, false);
          // 장바구니 UI에서 상품 제거
          removeCartItemFromUI(productId);
          // 장바구니 개수 업데이트
          fetchCartCount();
          showToast('장바구니에서 삭제되었습니다.');
        } else {
          alert('삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('오류:', error);
        alert('오류가 발생했습니다.');
      });
  } else {
    // 장바구니에 추가
    addProductToCartAndUpdateUI(productId, productData);
    setHeartFilled(heartIcon, true);
  }
}

// 장바구니 UI에서 상품 제거
function removeCartItemFromUI(productId) {
  const cartItem = document.querySelector(`#cartItem-${productId}`);
  if (cartItem) {
    cartItem.remove();

    // 장바구니가 비었는지 확인
    const remainingItems = document.querySelectorAll('.cart-item-row');
    if (remainingItems.length === 0) {
      showEmptyCartMessage();
    }

    // 합계 재계산
    calculateTotals();
  }
}

// 최근 본 상품 하트 상태 업데이트
function updateViewedProductHeart(productId, filled) {
  const heartBtns = document.querySelectorAll(`.viewed-wishlist-btn[data-product-id="${productId}"]`);
  heartBtns.forEach(heartBtn => {
    const heartIcon = heartBtn.querySelector('i');
    setHeartFilled(heartIcon, filled);
  });
}

// 빈 장바구니 메시지 표시
function showEmptyCartMessage() {
  const cartSection = document.querySelector('.wishlist-cart-section');
  const emptyCartHTML = `
    <div class="empty-cart text-center py-5" id="emptyCartMessage">
      <i class="bi bi-bag" style="font-size: 3rem;"></i>
      <h5 class="mt-3">장바구니가 비어 있습니다</h5>
      <p class="text-muted mt-2">마음에 드는 가구를 담아보세요.</p>
      <a href="/sub" class="btn btn-dark mt-3">상품 둘러보기</a>
    </div>
  `;

  cartSection.innerHTML = emptyCartHTML;
}

// 페이지 로드 시 장바구니 상태 동기화
function syncCartState() {
  fetch('/cart/check')
    .then(response => response.json())
    .then(data => {
      if (data && data.cart_items && Array.isArray(data.cart_items)) {
        // 최근 본 상품 하트 상태 동기화
        data.cart_items.forEach(item => {
          const heartBtns = document.querySelectorAll(`.viewed-wishlist-btn[data-product-id="${item.product_id}"]`);
          heartBtns.forEach(heartBtn => {
            const heartIcon = heartBtn.querySelector('i');
            setHeartFilled(heartIcon, true);
          });
        });
      }
    })
    .catch(error => {
      console.error('장바구니 확인 오류:', error);
    });
}

// 결제 정보 스크롤 따라오기
function initSummaryScroll() {
  const summarySection = document.getElementById('summarySection');
  if (!summarySection) return;

  const originalOffset = summarySection.offsetTop;
  const originalWidth = summarySection.offsetWidth;

  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const summaryHeight = summarySection.offsetHeight;

    if (scrollTop > originalOffset - 120) {
      if (!summarySection.classList.contains('sticky')) {
        summarySection.classList.add('sticky');
        summarySection.style.width = originalWidth + 'px';
      }
    } else {
      if (summarySection.classList.contains('sticky')) {
        summarySection.classList.remove('sticky');
        summarySection.style.width = 'auto';
      }
    }

    // 하단에서 고정 해제
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= documentHeight - 100) {
      summarySection.classList.remove('sticky');
      summarySection.style.width = 'auto';
    }
  }

  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', function() {
    if (!summarySection.classList.contains('sticky')) {
      originalWidth = summarySection.offsetWidth;
    }
  });
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 초기 합계 계산
  calculateTotals();
  // 헤더 배지 동기화
  fetchCartCount();
  // 장바구니 상태 동기화
  syncCartState();
  // 결제 정보 스크롤 초기화
  initSummaryScroll();

  const selectAllCheckbox = document.getElementById('selectAll');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const purchaseSelectedBtn = document.getElementById('purchaseSelectedBtn');

  // 전체 선택 체크박스
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.cart-item-checkbox').forEach((checkbox) => {
        checkbox.checked = checked;
      });
      calculateTotals();
    });
  }

  // 개별 체크박스 변경 시 합계 재계산 + 전체선택 스위칭
  document.querySelectorAll('.cart-item-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      calculateTotals();
      updateSelectAllCheckbox();
    });
  });

  // 수량 증가 버튼
  document.querySelectorAll('.quantity-increase').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      handleQuantityIncrease(productId);
    });
  });

  // 수량 감소 버튼
  document.querySelectorAll('.quantity-decrease').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      handleQuantityDecrease(productId);
    });
  });

  // 개별 삭제 버튼
  document.querySelectorAll('.cart-item-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      handleRemoveItem(productId);
    });
  });

  // 선택 삭제 버튼
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      const selectedCheckboxes = Array.from(
        document.querySelectorAll('.cart-item-checkbox:checked')
      );
      if (selectedCheckboxes.length === 0) {
        alert('삭제할 상품을 선택해주세요.');
        return;
      }

      if (!confirm('선택한 상품을 장바구니에서 삭제하시겠습니까?')) return;

      const promises = selectedCheckboxes.map((checkbox) => {
        const productId = checkbox.dataset.productId;
        return productId ? requestRemoveItem(productId) : Promise.resolve(null);
      });

      Promise.all(promises).then(() => {
        // UI에서 선택된 상품들 제거
        selectedCheckboxes.forEach(checkbox => {
          const productId = checkbox.dataset.productId;
          removeCartItemFromUI(productId);
          updateViewedProductHeart(productId, false);
        });
        fetchCartCount();
      });
    });
  }

  // 선택 상품 구매 버튼 (데모용)
  if (purchaseSelectedBtn) {
    purchaseSelectedBtn.addEventListener('click', () => {
      const selectedCheckboxes = Array.from(
        document.querySelectorAll('.cart-item-checkbox:checked')
      );
      if (selectedCheckboxes.length === 0) {
        alert('구매할 상품을 선택해주세요.');
        return;
      }

      const productIds = selectedCheckboxes
        .map((cb) => cb.dataset.productId)
        .filter(Boolean);

      alert(
        '구매하기는 추후 구현 예정입니다.'
      );
    });
  }
});