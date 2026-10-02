/* ============================================================
   HAGANE — product page logic
   1. Catalog data & cart math (pure functions — no DOM,
      exported for testing via module.exports in Node)
   2. DOM layer (guarded: only runs in the browser)
   ============================================================ */
"use strict";

/* ================= 1. CATALOG & CART MATH ================= */

var PRODUCT = {
  id: "hagane-gyuto",
  name: "Hagane Gyuto",
  sizes: {
    "6": { label: "6″", sub: "the nimble one", price: 149, was: 179 },
    "8": { label: "8″", sub: "the all-rounder", price: 179, was: 219 }
  },
  handles: {
    walnut: { label: "Walnut" },
    pakkawood: { label: "Pakkawood" }
  }
};

var FREE_SHIPPING_THRESHOLD = 150;
var SHIPPING_FLAT = 6.95;
var CART_KEY = "hagane-cart-v1";

function itemKey(handle, size) {
  return PRODUCT.id + "|" + handle + "|" + size;
}

function unitPrice(size) {
  var s = PRODUCT.sizes[size];
  return s ? s.price : 0;
}

function addLineItem(cart, handle, size, qty) {
  var key = itemKey(handle, size);
  var next = cart.map(function (l) { return { key: l.key, handle: l.handle, size: l.size, qty: l.qty }; });
  var found = null;
  next.forEach(function (l) { if (l.key === key) found = l; });
  if (found) {
    found.qty += qty;
  } else {
    next.push({ key: key, handle: handle, size: size, qty: qty });
  }
  return next;
}

function changeQty(cart, key, delta) {
  return cart
    .map(function (l) {
      if (l.key !== key) return { key: l.key, handle: l.handle, size: l.size, qty: l.qty };
      return { key: l.key, handle: l.handle, size: l.size, qty: l.qty + delta };
    })
    .filter(function (l) { return l.qty > 0; });
}

function removeLine(cart, key) {
  return cart.filter(function (l) { return l.key !== key; });
}

function cartCount(cart) {
  return cart.reduce(function (n, l) { return n + l.qty; }, 0);
}

function cartSubtotal(cart) {
  return cart.reduce(function (sum, l) { return sum + unitPrice(l.size) * l.qty; }, 0);
}

function shippingCost(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
}

function cartTotal(cart) {
  var sub = cartSubtotal(cart);
  return Math.round((sub + shippingCost(sub)) * 100) / 100;
}

function freeShipRemaining(subtotal) {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return Math.round((FREE_SHIPPING_THRESHOLD - subtotal) * 100) / 100;
}

function money(n) {
  return "$" + Number(n).toFixed(2);
}

function lineLabel(item) {
  var size = PRODUCT.sizes[item.size] ? PRODUCT.sizes[item.size].label : item.size;
  var handle = PRODUCT.handles[item.handle] ? PRODUCT.handles[item.handle].label : item.handle;
  return size + " · " + handle + " handle";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PRODUCT: PRODUCT,
    FREE_SHIPPING_THRESHOLD: FREE_SHIPPING_THRESHOLD,
    SHIPPING_FLAT: SHIPPING_FLAT,
    CART_KEY: CART_KEY,
    itemKey: itemKey,
    unitPrice: unitPrice,
    addLineItem: addLineItem,
    changeQty: changeQty,
    removeLine: removeLine,
    cartCount: cartCount,
    cartSubtotal: cartSubtotal,
    shippingCost: shippingCost,
    cartTotal: cartTotal,
    freeShipRemaining: freeShipRemaining,
    money: money,
    lineLabel: lineLabel
  };
}

/* ================= 2. DOM LAYER ================= */
if (typeof document !== "undefined") (function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var state = { size: "8", handle: "walnut", qty: 1 };

  /* ---------- Sticky nav ---------- */
  var nav = document.getElementById("siteNav");
  function onScrollNav() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Gallery ---------- */
  var mainImage = document.getElementById("mainImage");
  var thumbs = Array.prototype.slice.call(document.querySelectorAll(".thumb"));
  thumbs.forEach(function (thumb) {
    thumb.addEventListener("click", function () {
      if (thumb.classList.contains("active")) return;
      thumbs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      thumb.classList.add("active");
      thumb.setAttribute("aria-selected", "true");
      var swap = function () {
        mainImage.src = thumb.getAttribute("data-full");
        mainImage.alt = thumb.getAttribute("data-alt");
        mainImage.classList.remove("fading");
      };
      if (reduceMotion) { swap(); return; }
      mainImage.classList.add("fading");
      setTimeout(swap, 300);
    });
  });

  /* ---------- Variants & price ---------- */
  var productTitle = document.getElementById("productTitle");
  var priceNow = document.getElementById("priceNow");
  var priceWas = document.getElementById("priceWas");
  var saveChip = document.getElementById("saveChip");
  var sizeValue = document.getElementById("sizeValue");
  var handleValue = document.getElementById("handleValue");
  var stickySize = document.getElementById("stickySize");
  var stickyPrice = document.getElementById("stickyPrice");

  function refreshPrice() {
    var s = PRODUCT.sizes[state.size];
    productTitle.innerHTML = "Hagane <em>" + s.label + "</em> Gyuto";
    priceNow.textContent = money(s.price);
    priceWas.textContent = money(s.was);
    saveChip.textContent = "Save " + money(s.was - s.price).replace(".00", "");
    sizeValue.textContent = s.label + " — " + s.sub;
    handleValue.textContent = PRODUCT.handles[state.handle].label;
    stickySize.textContent = s.label;
    stickyPrice.textContent = money(s.price);
  }

  document.getElementById("sizeBtns").addEventListener("click", function (e) {
    var btn = e.target.closest(".swatch");
    if (!btn) return;
    state.size = btn.getAttribute("data-size");
    Array.prototype.forEach.call(this.querySelectorAll(".swatch"), function (b) {
      var on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", String(on));
    });
    refreshPrice();
  });

  document.getElementById("handleBtns").addEventListener("click", function (e) {
    var btn = e.target.closest(".swatch");
    if (!btn) return;
    state.handle = btn.getAttribute("data-handle");
    Array.prototype.forEach.call(this.querySelectorAll(".swatch"), function (b) {
      var on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", String(on));
    });
    refreshPrice();
  });

  /* ---------- Quantity stepper ---------- */
  var qtyVal = document.getElementById("qtyVal");
  document.getElementById("qtyMinus").addEventListener("click", function () {
    state.qty = Math.max(1, state.qty - 1);
    qtyVal.textContent = state.qty;
  });
  document.getElementById("qtyPlus").addEventListener("click", function () {
    state.qty = Math.min(9, state.qty + 1);
    qtyVal.textContent = state.qty;
  });

  /* ---------- Cart store ---------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (l) {
        return l && typeof l.qty === "number" && l.qty > 0 &&
          PRODUCT.sizes[l.size] && PRODUCT.handles[l.handle] &&
          l.key === itemKey(l.handle, l.size);
      });
    } catch (err) {
      return [];
    }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) {}
  }
  var cart = loadCart();

  /* ---------- Cart drawer ---------- */
  var drawer = document.getElementById("cartDrawer");
  var overlay = document.getElementById("cartOverlay");
  var cartCountEl = document.getElementById("cartCount");
  var cartHeadCount = document.getElementById("cartHeadCount");
  var cartLines = document.getElementById("cartLines");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartFoot = document.getElementById("cartFoot");
  var cartSuccess = document.getElementById("cartSuccess");
  var shipMsg = document.getElementById("shipMsg");
  var shipBar = document.getElementById("shipBar");
  var shipProgress = document.getElementById("shipProgress");
  var lastFocused = null;

  function openCart() {
    lastFocused = document.activeElement;
    cartSuccess.hidden = true;
    document.body.classList.add("cart-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add("show"); });
    document.getElementById("cartClose").focus();
  }
  function closeCart() {
    document.body.classList.remove("cart-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("show");
    setTimeout(function () { overlay.hidden = true; }, 350);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.getElementById("emptyContinue").addEventListener("click", closeCart);
  document.getElementById("successContinue").addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("cart-open")) closeCart();
  });

  function renderCart() {
    var count = cartCount(cart);
    var sub = cartSubtotal(cart);
    var ship = shippingCost(sub);
    var total = cartTotal(cart);
    var remaining = freeShipRemaining(sub);

    cartCountEl.textContent = count;
    cartCountEl.classList.remove("pop");
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add("pop");
    cartHeadCount.textContent = "(" + count + ")";

    if (cart.length === 0) {
      cartLines.innerHTML = "";
      cartLines.style.display = "none";
      cartEmpty.classList.add("show");
      cartFoot.style.display = "none";
      shipProgress.style.display = "none";
      return;
    }
    cartLines.style.display = "";
    cartEmpty.classList.remove("show");
    cartFoot.style.display = "";
    shipProgress.style.display = "";

    cartLines.innerHTML = "";
    cart.forEach(function (l) {
      var line = document.createElement("div");
      line.className = "cart-line";

      var img = document.createElement("img");
      img.src = "assets/gallery-1.jpg";
      img.alt = "Hagane Gyuto " + lineLabel(l);
      img.width = 168; img.height = 168;
      line.appendChild(img);

      var info = document.createElement("div");
      info.className = "line-info";
      var h3 = document.createElement("h3");
      h3.textContent = PRODUCT.name + " " + PRODUCT.sizes[l.size].label;
      var variant = document.createElement("p");
      variant.className = "line-variant";
      variant.textContent = PRODUCT.handles[l.handle].label + " handle";
      var row = document.createElement("div");
      row.className = "line-row";

      var stepper = document.createElement("div");
      stepper.className = "line-stepper";
      var minus = document.createElement("button");
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease quantity");
      minus.addEventListener("click", function () {
        cart = changeQty(cart, l.key, -1);
        saveCart(cart); renderCart();
      });
      var q = document.createElement("span");
      q.textContent = l.qty;
      var plus = document.createElement("button");
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase quantity");
      plus.addEventListener("click", function () {
        cart = changeQty(cart, l.key, 1);
        saveCart(cart); renderCart();
      });
      stepper.appendChild(minus); stepper.appendChild(q); stepper.appendChild(plus);

      var lineTotal = document.createElement("span");
      lineTotal.className = "line-total";
      lineTotal.textContent = money(unitPrice(l.size) * l.qty);

      row.appendChild(stepper); row.appendChild(lineTotal);
      info.appendChild(h3); info.appendChild(variant); info.appendChild(row);

      var remove = document.createElement("button");
      remove.className = "line-remove";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + lineLabel(l) + " from cart");
      remove.addEventListener("click", function () {
        cart = removeLine(cart, l.key);
        saveCart(cart); renderCart();
      });
      info.appendChild(remove);
      line.appendChild(info);
      cartLines.appendChild(line);
    });

    if (remaining > 0) {
      shipMsg.innerHTML = "<strong>" + money(remaining) + "</strong> away from free shipping";
    } else {
      shipMsg.innerHTML = "You unlocked <strong>free shipping</strong>";
    }
    shipBar.style.width = Math.min(100, (sub / FREE_SHIPPING_THRESHOLD) * 100) + "%";

    document.getElementById("cartSubtotal").textContent = money(sub);
    document.getElementById("cartShipping").textContent = ship === 0 ? "Free" : money(ship);
    document.getElementById("cartTotal").textContent = money(total);
  }

  function addToCart() {
    cart = addLineItem(cart, state.handle, state.size, state.qty);
    saveCart(cart);
    renderCart();
    openCart();
    state.qty = 1;
    qtyVal.textContent = "1";
  }
  document.getElementById("addToCart").addEventListener("click", addToCart);
  document.getElementById("stickyAdd").addEventListener("click", addToCart);

  /* ---------- Demo checkout ---------- */
  document.getElementById("checkoutBtn").addEventListener("click", function () {
    if (cart.length === 0) return;
    var orderNo = "HG-" + Math.floor(100000 + Math.random() * 900000);
    var eta = new Date(Date.now() + 5 * 864e5).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });
    document.getElementById("orderDetails").textContent =
      "Order " + orderNo + " · " + cartCount(cart) + " item" + (cartCount(cart) > 1 ? "s" : "") +
      " · arriving by " + eta + ".";
    cart = [];
    saveCart(cart);
    renderCart();
    cartLines.style.display = "none";
    cartEmpty.classList.remove("show");
    cartFoot.style.display = "none";
    shipProgress.style.display = "none";
    cartSuccess.hidden = false;
  });

  /* ---------- Accordions ---------- */
  document.querySelectorAll(".acc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });

  /* ---------- Sticky buy bar (mobile) ---------- */
  var stickyBar = document.getElementById("stickyBar");
  var buybox = document.getElementById("buybox");
  function onScrollSticky() {
    var past = buybox.getBoundingClientRect().bottom < 0;
    var cartOpen = document.body.classList.contains("cart-open");
    stickyBar.classList.toggle("show", past && !cartOpen);
  }
  window.addEventListener("scroll", onScrollSticky, { passive: true });
  onScrollSticky();

  refreshPrice();
  renderCart();
})();
