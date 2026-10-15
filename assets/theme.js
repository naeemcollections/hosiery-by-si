(function () {
  var body = document.body;
  var phone = (body.dataset.wa || "").replace(/\D/g, "");
  var store = body.dataset.store || "Order";
  var freeShip = Number(body.dataset.free || 3000);
  var KEY = "rime-bag";
  var drawer = document.querySelector("[data-drawer]");
  var linesEl = document.querySelector("[data-bag-lines]");
  var totalEl = document.querySelector("[data-bag-total]");
  var noteEl = document.querySelector("[data-ship-note]");
  var countEl = document.querySelector("[data-bag-count]");

  function read() {
    try {
      var parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function rs(amount) {
    return "Rs " + Math.round(amount).toLocaleString("en-PK");
  }

  function orderText(lines) {
    var rows = lines.map(function (line) {
      return "• " + line.name + "  ×  " + line.qty + "  —  " + rs(line.price * line.qty);
    });
    var total = lines.reduce(function (sum, line) {
      return sum + line.price * line.qty;
    }, 0);
    return store + " order\n" + rows.join("\n") + "\n\nTotal: " + rs(total);
  }

  function openWa(text) {
    if (!phone) {
      window.alert("Add your WhatsApp number in Theme settings.");
      return;
    }
    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  }

  function setOpen(open) {
    if (drawer) drawer.hidden = !open;
  }

  function render() {
    var lines = read();
    var count = lines.reduce(function (sum, line) { return sum + line.qty; }, 0);
    if (countEl) {
      countEl.hidden = count === 0;
      countEl.textContent = String(count);
    }
    if (!linesEl) return;
    linesEl.replaceChildren();
    if (lines.length === 0) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "The bag is empty. Choose a quantity and add a piece.";
      linesEl.appendChild(empty);
    }
    lines.forEach(function (line) {
      var row = document.createElement("div");
      row.className = "bag-line";
      var img = document.createElement("img");
      img.alt = "";
      img.src = line.image || "";
      var copy = document.createElement("div");
      var name = document.createElement("strong");
      name.textContent = line.name;
      var price = document.createElement("p");
      price.className = "muted";
      price.textContent = rs(line.price);
      var qty = document.createElement("div");
      qty.className = "qty";
      qty.setAttribute("data-qty", "");
      qty.setAttribute("data-line", line.id);
      qty.innerHTML = "<button type='button' data-dec aria-label='Decrease'>−</button><input data-qty-input type='number' min='0' max='99' value='" + line.qty + "'><button type='button' data-inc aria-label='Increase'>+</button>";
      copy.append(name, price, qty);
      row.append(img, copy);
      linesEl.appendChild(row);
    });
    var total = lines.reduce(function (sum, line) { return sum + line.price * line.qty; }, 0);
    if (totalEl) totalEl.textContent = rs(total);
    if (noteEl) {
      if (lines.length === 0) noteEl.textContent = "Free shipping over " + rs(freeShip) + ".";
      else if (total >= freeShip) noteEl.textContent = "Free shipping is included.";
      else noteEl.textContent = rs(freeShip - total) + " more for free shipping.";
    }
  }

  function write(lines) {
    localStorage.setItem(KEY, JSON.stringify(lines));
    render();
  }

  function showSlide(slider, index) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll("[data-slide]"));
    var dots = Array.prototype.slice.call(slider.querySelectorAll("[data-dot]"));
    if (!slides.length) return;
    var next = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) { slide.classList.toggle("is-on", i === next); });
    dots.forEach(function (dot, i) { dot.classList.toggle("is-on", i === next); });
  }

  function slideIndex(slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll("[data-slide]"));
    var index = slides.findIndex(function (slide) { return slide.classList.contains("is-on"); });
    return index < 0 ? 0 : index;
  }

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-open-bag]")) setOpen(true);
    if (target.closest("[data-close-bag]")) setOpen(false);

    var dec = target.closest("[data-dec]");
    var inc = target.closest("[data-inc]");
    if (dec || inc) {
      var wrap = target.closest("[data-qty]");
      var input = wrap && wrap.querySelector("[data-qty-input]");
      if (input && wrap) {
        var lineId = wrap.getAttribute("data-line");
        var floor = lineId ? 0 : 1;
        var nextQty = Math.max(floor, Math.min(99, Number(input.value || 1) + (inc ? 1 : -1)));
        input.value = String(nextQty);
        if (lineId) {
          write(read().map(function (line) {
            return line.id === lineId ? Object.assign({}, line, { qty: nextQty }) : line;
          }).filter(function (line) { return line.qty > 0; }));
        }
      }
    }

    var add = target.closest("[data-add]");
    if (add) {
      var scope = add.closest(".card") || add.closest("form") || add.closest(".panel");
      var qtyInput = scope && scope.querySelector("[data-qty-input]");
      var qty = Math.max(1, Math.min(99, Number(qtyInput && qtyInput.value ? qtyInput.value : 1)));
      var id = add.getAttribute("data-id");
      var lines = read();
      var found = false;
      lines.forEach(function (line) {
        if (line.id === id) {
          line.qty = Math.min(99, line.qty + qty);
          found = true;
        }
      });
      if (!found) {
        lines.push({
          id: id,
          name: add.getAttribute("data-name") || "Piece",
          price: Number(add.getAttribute("data-price") || 0),
          image: add.getAttribute("data-image") || "",
          qty: qty
        });
      }
      write(lines);
      setOpen(true);
    }

    if (target.closest("[data-clear-bag]")) write([]);
    if (target.closest("[data-wa-order]")) {
      var bag = read();
      if (bag.length) openWa(orderText(bag));
    }
    if (target.closest("[data-wa-single]")) {
      var form = target.closest("form") || document;
      var source = form.querySelector("[data-add]");
      var singleQty = form.querySelector("[data-qty-input]");
      if (source) {
        openWa(orderText([{
          name: source.getAttribute("data-name") || "Piece",
          price: Number(source.getAttribute("data-price") || 0),
          qty: Math.max(1, Number(singleQty && singleQty.value ? singleQty.value : 1))
        }]));
      }
    }

    var slider = target.closest("[data-slider]");
    if (slider && target.closest("[data-prev]")) showSlide(slider, slideIndex(slider) - 1);
    if (slider && target.closest("[data-next]")) showSlide(slider, slideIndex(slider) + 1);
    var dot = target.closest("[data-dot]");
    if (slider && dot) {
      var dots = Array.prototype.slice.call(slider.querySelectorAll("[data-dot]"));
      showSlide(slider, dots.indexOf(dot));
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-slider]"), function (slider) {
    var wait = Number(slider.getAttribute("data-autoplay") || 5000);
    var timer = window.setInterval(function () { showSlide(slider, slideIndex(slider) + 1); }, wait);
    slider.addEventListener("mouseenter", function () { window.clearInterval(timer); });
    slider.addEventListener("mouseleave", function () {
      timer = window.setInterval(function () { showSlide(slider, slideIndex(slider) + 1); }, wait);
    });
  });

  render();
})();
