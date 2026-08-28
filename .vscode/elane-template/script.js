/* =========================================================================
   ÉLANE — Modern Womenswear
   script.js  ·  vanilla JavaScript, no framework, no TypeScript
   Handles: mood filtering, product grid, favourites, search, cart drawer,
            product modal, checkout flow, toasts and body scroll-lock.
   ========================================================================= */

(function () {
  "use strict";

  /* -------------------------------- DATA -------------------------------- */

  var products = [
    { id: 1, name: "The Noire Zip Top",    category: "Tops",       price: 38500, image: "assets/product-black-zip.webp",       badge: "Bestseller", colors: ["#171515", "#ece4da"] },
    { id: 2, name: "Amélie Ruched Top",    category: "Tops",       price: 32500, image: "assets/product-blush-ruched.webp",     badge: "New",        colors: ["#c98f91", "#f0ddd0", "#4b2625"] },
    { id: 3, name: "Serein Sculpted Top",  category: "Tops",       price: 42000, image: "assets/product-ivory-sculpted.webp",                        colors: ["#ede4d6", "#2e2421"] },
    { id: 4, name: "Cocoa Column Dress",   category: "Dresses",    price: 68500, image: "assets/product-chocolate-dress.webp",  badge: "Limited",    colors: ["#5a3128", "#1c1a19"] },
    { id: 5, name: "Alba Linen Co-ord",    category: "Sets",       price: 74500, image: "assets/product-sage-set.webp",                              colors: ["#9ca493", "#dfd6c6"] },
    { id: 6, name: "Rouge Tie Top",        category: "Essentials", price: 29500, image: "assets/product-red-top.webp",                               colors: ["#913c3c", "#f2e9dc", "#1d1c1b"] }
  ];

  var sizes = ["XS", "S", "M", "L", "XL"];
  var FREE_DELIVERY = 80000;

  var nairaFormatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  });
  function money(value) { return nairaFormatter.format(value); }

  /* ------------------------------- ICONS -------------------------------- */
  /* Inline SVGs replacing the original lucide-react components. */

  var SVG_ATTRS =
    'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false"';

  var ICON_PATHS = {
    "arrow-right":  '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "plus":         '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "minus":        '<path d="M5 12h14"/>',
    "x":            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "check":        '<path d="M20 6 9 17l-5-5"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "search":       '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "shopping-bag": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
  };

  function icon(name) {
    return "<svg " + SVG_ATTRS + ">" + ICON_PATHS[name] + "</svg>";
  }

  function heartIcon(filled) {
    var fill = filled ? "currentColor" : "none";
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' +
      'fill="' + fill + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  }

  /* ------------------------------- STATE -------------------------------- */

  var state = {
    category: "All",
    cart: [],              /* { product, size, quantity } */
    favourites: [],        /* product ids */
    activeOverlay: null,   /* "menu" | "search" | "cart" | "product" | "checkout" */
    product: null,         /* product shown in the modal */
    size: "S",             /* selected size in the product modal */
    query: "",             /* search query */
    checkoutReviewed: false
  };

  /* ---------------------------- DOM SHORTCUTS --------------------------- */

  var grid = document.getElementById("product-grid");
  var countLabel = document.getElementById("product-count");
  var filtersRow = document.getElementById("filters");
  var bagCount = document.getElementById("bag-count");
  var overlayRoot = document.getElementById("overlay-root");
  var toastRoot = document.getElementById("toast-root");
  var toastTimer = null;

  /* ------------------------------ HELPERS ------------------------------- */

  function filteredProducts() {
    return state.category === "All"
      ? products
      : products.filter(function (item) { return item.category === state.category; });
  }

  function searchResults() {
    var value = state.query.trim().toLowerCase();
    if (!value) return products.slice(0, 4);
    return products.filter(function (item) {
      return (item.name + " " + item.category).toLowerCase().indexOf(value) !== -1;
    });
  }

  function cartCount() {
    return state.cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }

  function cartSubtotal() {
    return state.cart.reduce(function (sum, item) { return sum + item.product.price * item.quantity; }, 0);
  }

  function isFavourite(id) { return state.favourites.indexOf(id) !== -1; }

  function lockBody() {
    document.body.classList.toggle("locked", state.activeOverlay !== null);
  }

  function updateBagCount() { bagCount.textContent = cartCount(); }

  /* --------------------------- PRODUCT GRID ----------------------------- */

  function renderGrid() {
    var list = filteredProducts();
    countLabel.textContent = list.length + " piece" + (list.length === 1 ? "" : "s");

    /* Reflect the active filter button. */
    Array.prototype.forEach.call(filtersRow.children, function (button) {
      button.classList.toggle("active", button.getAttribute("data-category") === state.category);
    });

    grid.innerHTML = list.map(function (item) {
      var swatches = item.colors.map(function (color) {
        return '<i style="background:' + color + '"></i>';
      }).join("");

      return '' +
        '<article class="product-card" data-id="' + item.id + '">' +
          '<div class="product-image">' +
            '<button class="image-button" data-action="open" aria-label="View ' + item.name + '">' +
              '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy" />' +
            '</button>' +
            (item.badge ? '<span class="badge">' + item.badge + '</span>' : '') +
            '<button class="heart' + (isFavourite(item.id) ? ' liked' : '') + '" data-action="favourite" aria-label="Toggle favourite">' +
              heartIcon(isFavourite(item.id)) +
            '</button>' +
            '<button class="quick-add" data-action="add">Quick add ' + icon("plus") + '</button>' +
          '</div>' +
          '<div class="product-info">' +
            '<div>' +
              '<button data-action="open">' + item.name + '</button>' +
              '<p>' + money(item.price) + '</p>' +
            '</div>' +
            '<div class="swatches">' + swatches + '</div>' +
          '</div>' +
        '</article>';
    }).join("");
  }

  /* Delegated events for the product grid. */
  grid.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    var card = event.target.closest(".product-card");
    var product = products.find(function (item) { return item.id === Number(card.getAttribute("data-id")); });
    var action = trigger.getAttribute("data-action");

    if (action === "open") openProduct(product);
    else if (action === "add") addToCart(product, "S");
    else if (action === "favourite") toggleFavourite(product.id, trigger);
  });

  function toggleFavourite(id, button) {
    if (isFavourite(id)) {
      state.favourites = state.favourites.filter(function (item) { return item !== id; });
    } else {
      state.favourites.push(id);
    }
    if (button) {
      var liked = isFavourite(id);
      button.classList.toggle("liked", liked);
      button.innerHTML = heartIcon(liked);
    }
  }

  /* ------------------------------- CART --------------------------------- */

  function addToCart(product, size) {
    var match = state.cart.find(function (item) {
      return item.product.id === product.id && item.size === size;
    });
    if (match) {
      match.quantity += 1;
    } else {
      state.cart.push({ product: product, size: size, quantity: 1 });
    }
    updateBagCount();
    if (state.activeOverlay === "product") closeOverlay();
    showToast(product.name + " added to your bag");
  }

  function changeQuantity(id, size, change) {
    state.cart = state.cart
      .map(function (item) {
        if (item.product.id === id && item.size === size) {
          return { product: item.product, size: item.size, quantity: item.quantity + change };
        }
        return item;
      })
      .filter(function (item) { return item.quantity > 0; });
    updateBagCount();
    if (state.activeOverlay === "cart") renderOverlay();
  }

  /* ----------------------------- OVERLAYS ------------------------------- */

  function openOverlay(name) {
    state.activeOverlay = name;
    renderOverlay();
    lockBody();
  }

  function closeOverlay() {
    state.activeOverlay = null;
    state.product = null;
    overlayRoot.innerHTML = "";
    lockBody();
  }

  function openProduct(product) {
    state.product = product;
    state.size = "S";
    openOverlay("product");
  }

  function startCheckout() {
    state.checkoutReviewed = false;
    openOverlay("checkout");
  }

  /* Builds the markup for whichever overlay is active, then wires it up. */
  function renderOverlay() {
    var html = "";
    if (state.activeOverlay === "menu") html = menuMarkup();
    else if (state.activeOverlay === "search") html = searchMarkup();
    else if (state.activeOverlay === "cart") html = cartMarkup();
    else if (state.activeOverlay === "product") html = productMarkup();
    else if (state.activeOverlay === "checkout") html = checkoutMarkup();
    overlayRoot.innerHTML = html;
    wireOverlay();
  }

  /* ---- Mobile navigation drawer ---- */
  function menuMarkup() {
    var links = [["New in", "#new"], ["Shop", "#shop"], ["The edit", "#edit"], ["Our story", "#story"]];
    var items = links.map(function (link, index) {
      return '<a href="' + link[1] + '" data-close-menu><small>0' + (index + 1) + '</small>' + link[0] + icon("arrow-right") + '</a>';
    }).join("");

    return '' +
      '<div class="overlay left-overlay" role="dialog" aria-modal="true" aria-label="Navigation">' +
        '<button class="backdrop" data-close aria-label="Close menu"></button>' +
        '<aside class="mobile-menu">' +
          '<div class="drawer-head">' +
            '<span class="logo">ÉLANE</span>' +
            '<button class="icon" data-close>' + icon("x") + '</button>' +
          '</div>' +
          '<nav>' + items + '</nav>' +
          '<p>Complimentary Lagos delivery over ₦80,000.</p>' +
        '</aside>' +
      '</div>';
  }

  /* ---- Search overlay ---- */
  function searchMarkup() {
    return '' +
      '<div class="overlay search-overlay" role="dialog" aria-modal="true" aria-label="Search products">' +
        '<button class="backdrop" data-close aria-label="Close search"></button>' +
        '<section class="search-panel">' +
          '<div class="search-input">' +
            icon("search") +
            '<label class="sr-only" for="search">Search products</label>' +
            '<input id="search" placeholder="Search tops, dresses, sets…" value="' + state.query + '" />' +
            '<button class="icon" data-close>' + icon("x") + '</button>' +
          '</div>' +
          '<p class="search-caption" id="search-caption"></p>' +
          '<div class="search-results" id="search-results"></div>' +
        '</section>' +
      '</div>';
  }

  function renderSearchResults() {
    var caption = document.getElementById("search-caption");
    var container = document.getElementById("search-results");
    var results = searchResults();

    caption.textContent = state.query ? (results.length + " results") : "Popular right now";

    if (!results.length) {
      container.innerHTML = "<p>No pieces found. Try “tops” or “dress”.</p>";
      return;
    }
    container.innerHTML = results.map(function (item) {
      return '<button data-id="' + item.id + '">' +
        '<img src="' + item.image + '" alt="" />' +
        '<span><b>' + item.name + '</b><small>' + item.category + ' · ' + money(item.price) + '</small></span>' +
        icon("arrow-right") +
        '</button>';
    }).join("");
  }

  /* ---- Cart drawer ---- */
  function cartMarkup() {
    var count = cartCount();
    var body;

    if (state.cart.length) {
      var subtotal = cartSubtotal();
      var items = state.cart.map(function (item) {
        return '<article class="cart-item">' +
          '<img src="' + item.product.image + '" alt="' + item.product.name + '" />' +
          '<div>' +
            '<h3>' + item.product.name + '</h3>' +
            '<p>Size ' + item.size + '</p>' +
            '<div>' +
              '<span class="quantity">' +
                '<button data-qty="-1" data-id="' + item.product.id + '" data-size="' + item.size + '">' + icon("minus") + '</button>' +
                '<b>' + item.quantity + '</b>' +
                '<button data-qty="1" data-id="' + item.product.id + '" data-size="' + item.size + '">' + icon("plus") + '</button>' +
              '</span>' +
              '<strong>' + money(item.product.price * item.quantity) + '</strong>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join("");

      var progress = Math.min(100, subtotal / 800);
      var deliveryNote = subtotal >= FREE_DELIVERY
        ? "You unlocked complimentary Lagos delivery."
        : money(FREE_DELIVERY - subtotal) + " away from complimentary delivery.";

      body = '' +
        '<div class="cart-items">' + items + '</div>' +
        '<div class="cart-summary">' +
          '<div class="delivery-bar"><i style="width:' + progress + '%"></i></div>' +
          '<p>' + deliveryNote + '</p>' +
          '<div><span>Subtotal</span><b>' + money(subtotal) + '</b></div>' +
          '<small>Delivery is calculated at checkout.</small>' +
          '<button class="button dark" data-checkout>Checkout securely ' + icon("arrow-right") + '</button>' +
          '<button class="continue" data-close>Continue shopping</button>' +
        '</div>';
    } else {
      body = '' +
        '<div class="empty-bag">' +
          icon("shopping-bag") +
          '<h3>Your bag is waiting</h3>' +
          '<p>Choose a piece that feels like you.</p>' +
          '<button class="button dark" data-shop-close="All">Start shopping</button>' +
        '</div>';
    }

    return '' +
      '<div class="overlay right-overlay" role="dialog" aria-modal="true" aria-label="Shopping bag">' +
        '<button class="backdrop" data-close aria-label="Close bag"></button>' +
        '<aside class="cart-drawer">' +
          '<div class="drawer-head">' +
            '<div><p class="eyebrow">Your selection</p><h2>Shopping bag <small>' + count + '</small></h2></div>' +
            '<button class="icon" data-close>' + icon("x") + '</button>' +
          '</div>' +
          body +
        '</aside>' +
      '</div>';
  }

  /* ---- Product modal ---- */
  function productMarkup() {
    var product = state.product;
    var swatches = product.colors.map(function (color, index) {
      return '<i class="' + (index === 0 ? "chosen" : "") + '" style="background:' + color + '"></i>';
    }).join("");
    var sizeButtons = sizes.map(function (item) {
      return '<button class="' + (state.size === item ? "active" : "") + '" data-size="' + item + '">' + item + '</button>';
    }).join("");

    return '' +
      '<div class="overlay modal-overlay" role="dialog" aria-modal="true" aria-label="' + product.name + '">' +
        '<button class="backdrop" data-close aria-label="Close product"></button>' +
        '<section class="product-modal">' +
          '<button class="icon modal-x" data-close>' + icon("x") + '</button>' +
          '<div class="modal-image"><img src="' + product.image + '" alt="' + product.name + '" /></div>' +
          '<div class="modal-copy">' +
            '<p class="eyebrow">' + product.category + '</p>' +
            '<h2>' + product.name + '</h2>' +
            '<p class="modal-price">' + money(product.price) + '</p>' +
            '<p class="description">A considered silhouette with a close, flattering fit and softly structured detail. Cut to dress up beautifully without feeling overdone.</p>' +
            '<div class="choice">' +
              '<span><b>Colour</b><small>Signature</small></span>' +
              '<div class="modal-swatches">' + swatches + '</div>' +
            '</div>' +
            '<div class="choice">' +
              '<span><b>Select size</b><button>Size guide</button></span>' +
              '<div class="sizes">' + sizeButtons + '</div>' +
            '</div>' +
            '<button class="button dark add-button" data-add>Add to bag · ' + money(product.price) + '</button>' +
            '<details><summary>Details &amp; fit ' + icon("chevron-down") + '</summary><p>True to size with a close fit. Model wears size S. Premium stretch fabric with concealed finishing.</p></details>' +
            '<details><summary>Delivery &amp; exchanges ' + icon("chevron-down") + '</summary><p>Delivery in Lagos from 1–3 working days. Easy exchanges requested within 7 days.</p></details>' +
          '</div>' +
        '</section>' +
      '</div>';
  }

  /* ---- Checkout ---- */
  /*function checkoutMarkup() {
    var inner;
    if (state.checkoutReviewed) {
      inner = '' +
        '<div class="order-ready">' +
          '<i>' + icon("check") + '</i>' +
          '<p class="eyebrow">Order prepared</p>' +
          '<h2>Beautiful choice.</h2>' +
          '<p>Your delivery details are ready. Connect your preferred payment provider before taking live payments.</p>' +
          '<button class="button dark" data-finish>Return to the shop</button>' +
        '</div>';
    } else {
      var summaryItems = state.cart.map(function (item) {
        return '<div class="summary-item">' +
          '<img src="' + item.product.image + '" alt="" />' +
          '<span><b>' + item.product.name + '</b><small>Size ' + item.size + ' · Qty ' + item.quantity + '</small></span>' +
          '<strong>' + money(item.product.price * item.quantity) + '</strong>' +
        '</div>';
      }).join("");

      inner = '' +
        '<div class="checkout-body">' +
          '<form id="checkout-form">' +
            '<p class="eyebrow">Delivery details</p>' +
            '<h2>Where should we send it?</h2>' +
            '<div class="field-row">' +
              '<label>First name<input required autocomplete="given-name" /></label>' +
              '<label>Last name<input required autocomplete="family-name" /></label>' +
            '</div>' +
            '<label>Email address<input required type="email" autocomplete="email" /></label>' +
            '<label>Phone number<input required type="tel" placeholder="0800 000 0000" /></label>' +
            '<label>Delivery address<input required autocomplete="street-address" /></label>' +
            '<div class="field-row">' +
              '<label>City<input required value="Lagos" /></label>' +
              '<label>State<select><option>Lagos</option><option>Abuja FCT</option><option>Ogun</option><option>Rivers</option><option>Other</option></select></label>' +
            '</div>' +
            '<button class="button dark" type="submit">Review order ' + icon("arrow-right") + '</button>' +
          '</form>' +
          '<aside>' +
            '<p class="eyebrow">Order summary</p>' +
            summaryItems +
            '<div class="summary-total"><span>Total</span><b>' + money(cartSubtotal()) + '</b></div>' +
          '</aside>' +
        '</div>';
    }//

    return '' +
      '<div class="overlay modal-overlay" role="dialog" aria-modal="true" aria-label="Checkout">' +
        '<button class="backdrop" data-close aria-label="Close checkout"></button>' +
        '<section class="checkout">' +
          '<div class="checkout-head">' +
            '<span class="logo">ÉLANE</span>' +
            '<button class="icon" data-close>' + icon("x") + '</button>' +
          '</div>' +
          inner +
        '</section>' +
      '</div>';
  }

  /* Attaches behaviour to the freshly-rendered overlay. */
  function wireOverlay() {
    /* Close on backdrop / X / continue / menu-link. */
    overlayRoot.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeOverlay);
    });
    overlayRoot.querySelectorAll("[data-close-menu]").forEach(function (el) {
      el.addEventListener("click", closeOverlay);
    });

    /* "Start shopping" from the empty bag: close, then scroll to shop. */
    overlayRoot.querySelectorAll("[data-shop-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        var category = el.getAttribute("data-shop-close");
        closeOverlay();
        shopNow(category);
      });
    });

    if (state.activeOverlay === "search") {
      var input = document.getElementById("search");
      renderSearchResults();
      input.addEventListener("input", function () {
        state.query = input.value;
        renderSearchResults();
      });
      document.getElementById("search-results").addEventListener("click", function (event) {
        var button = event.target.closest("button[data-id]");
        if (!button) return;
        var product = products.find(function (item) { return item.id === Number(button.getAttribute("data-id")); });
        openProduct(product);
      });
      input.focus();
    }

    if (state.activeOverlay === "cart") {
      overlayRoot.querySelectorAll("[data-qty]").forEach(function (button) {
        button.addEventListener("click", function () {
          changeQuantity(Number(button.getAttribute("data-id")), button.getAttribute("data-size"), Number(button.getAttribute("data-qty")));
        });
      });
      var checkoutBtn = overlayRoot.querySelector("[data-checkout]");
      if (checkoutBtn) checkoutBtn.addEventListener("click", startCheckout);
    }

    if (state.activeOverlay === "product") {
      overlayRoot.querySelectorAll(".sizes button").forEach(function (button) {
        button.addEventListener("click", function () {
          state.size = button.getAttribute("data-size");
          overlayRoot.querySelectorAll(".sizes button").forEach(function (b) {
            b.classList.toggle("active", b === button);
          });
        });
      });
      overlayRoot.querySelector("[data-add]").addEventListener("click", function () {
        addToCart(state.product, state.size);
      });
    }

    if (state.activeOverlay === "checkout") {
      var form = document.getElementById("checkout-form");
      if (form) {
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          state.checkoutReviewed = true;
          renderOverlay();
        });
      }
      var finish = overlayRoot.querySelector("[data-finish]");
      if (finish) {
        finish.addEventListener("click", function () {
          state.cart = [];
          updateBagCount();
          closeOverlay();
        });
      }
    }
  }

  /* ------------------------------- TOAST -------------------------------- */

  function showToast(message) {
    toastRoot.innerHTML = '<div class="toast" role="status">' + icon("check") + message + "</div>";
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastRoot.innerHTML = ""; }, 2400);
  }

  /* ----------------------------- NAVIGATION ----------------------------- */

  function shopNow(category) {
    state.category = category || "All";
    renderGrid();
    window.setTimeout(function () {
      var shop = document.getElementById("shop");
      if (shop) shop.scrollIntoView({ behavior: "smooth" });
    }, 20);
  }

  /* --------------------------- GLOBAL EVENTS ---------------------------- */

  /* Header buttons that open overlays. */
  document.querySelectorAll("[data-open]").forEach(function (button) {
    button.addEventListener("click", function () { openOverlay(button.getAttribute("data-open")); });
  });

  /* "Shop the edit" / mood cards / "Discover the collection". */
  document.querySelectorAll("[data-shop]").forEach(function (button) {
    button.addEventListener("click", function () { shopNow(button.getAttribute("data-shop")); });
  });

  /* Category filters. */
  filtersRow.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-category]");
    if (!button) return;
    state.category = button.getAttribute("data-category");
    renderGrid();
  });

  /* Newsletter sign-up. */
  document.getElementById("newsletter-form").addEventListener("submit", function (event) {
    event.preventDefault();
    showToast("You're on the ÉLANE list ✦");
    event.currentTarget.reset();
  });

  /* Close the active overlay with the Escape key. */
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.activeOverlay) closeOverlay();
  });

  /* ------------------------------- INIT --------------------------------- */

  renderGrid();
  updateBagCount();
})();
