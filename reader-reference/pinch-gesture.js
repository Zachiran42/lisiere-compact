/* Reader-only two-finger font resizing. Kept readable for future maintenance. */
  var currentFontSize = config.fontSize;
  var pinch = null;
  var pendingFontSize = null;
  var pinchFrame = 0;
  var suppressClickUntil = 0;
  var sizeBadge = null;
  var badgeTimer = 0;
  function clampFontSize(value) {
    return Math.max(14, Math.min(32, Math.round(value)));
  }
  function distanceBetween(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function fontAnchor(x, y) {
    var main = document.querySelector('main');
    var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    if (!range && document.caretPositionFromPoint) {
      var position = document.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    if (range && main && main.contains(range.startContainer)) {
      var line = range.getClientRects()[0];
      if (line) return { range: range, top: line.top };
    }
    var element = document.elementFromPoint(x, y);
    var block = element && element.closest ? element.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,td,figure') : null;
    if (block && main && main.contains(block)) {
      var rect = block.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (y - rect.top) / Math.max(1, rect.height)));
      return { element: block, ratio: ratio, top: rect.top + ratio * rect.height };
    }
    return null;
  }
  function anchorTop(anchor) {
    if (anchor.range) {
      var line = anchor.range.getClientRects()[0];
      return line ? line.top : null;
    }
    var rect = anchor.element.getBoundingClientRect();
    return rect.top + anchor.ratio * rect.height;
  }
  function showFontSize() {
    if (!sizeBadge) {
      sizeBadge = document.createElement('div');
      sizeBadge.setAttribute('aria-hidden', 'true');
      sizeBadge.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);padding:6px 12px;border-radius:16px;background:#234c3d;color:#fff;font:13px/1.2 system-ui,sans-serif;pointer-events:none;z-index:2147483647;box-shadow:0 2px 8px #0002';
      document.body.appendChild(sizeBadge);
    }
    sizeBadge.textContent = currentFontSize + ' px';
    sizeBadge.style.display = 'block';
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(function () { sizeBadge.style.display = 'none'; }, 900);
  }
  function applyFontSize(value, anchor, showBadge) {
    value = clampFontSize(value);
    if (value === currentFontSize) return;
    var savedFraction = fraction();
    currentFontSize = value;
    document.body.style.fontSize = value + 'px';
    var top = anchor ? anchorTop(anchor) : null;
    if (top !== null && anchor) window.scrollBy(0, top - anchor.top);
    else window.scrollTo(0, savedFraction * Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
    if (showBadge) showFontSize();
  }
  function flushPinch() {
    if (pinchFrame) { cancelAnimationFrame(pinchFrame); pinchFrame = 0; }
    if (pinch && pendingFontSize !== null) applyFontSize(pendingFontSize, pinch.anchor, true);
    pendingFontSize = null;
  }
  function finishPinch() {
    if (!pinch) return;
    flushPinch();
    var changed = currentFontSize !== pinch.startSize;
    pinch = null;
    suppressClickUntil = Date.now() + 400;
    lastValue = -1;
    report();
    if (changed) post('fontSize', currentFontSize);
  }
  function preventTouchDefault(event) {
    if (event.cancelable) event.preventDefault();
  }
  document.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 2) { if (pinch) finishPinch(); return; }
    if (pinch || restoring) return;
    var a = event.touches[0], b = event.touches[1];
    var distance = distanceBetween(a, b);
    if (distance < 12) return;
    clearTimeout(timer);
    pinch = { ids: [a.identifier, b.identifier], startDistance: distance, startSize: currentFontSize,
      anchor: fontAnchor((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2) };
    preventTouchDefault(event);
  }, { passive: false });
  document.addEventListener('touchmove', function (event) {
    if (!pinch) return;
    preventTouchDefault(event);
    if (event.touches.length !== 2) { finishPinch(); return; }
    var a = null, b = null;
    for (var index = 0; index < event.touches.length; index++) {
      var touch = event.touches[index];
      if (touch.identifier === pinch.ids[0]) a = touch;
      if (touch.identifier === pinch.ids[1]) b = touch;
    }
    if (!a || !b) { finishPinch(); return; }
    pendingFontSize = clampFontSize(pinch.startSize * distanceBetween(a, b) / pinch.startDistance);
    if (!pinchFrame) pinchFrame = requestAnimationFrame(function () { pinchFrame = 0; flushPinch(); });
  }, { passive: false });
  document.addEventListener('touchend', function (event) {
    if (pinch) { preventTouchDefault(event); if (event.touches.length < 2) finishPinch(); }
  }, { passive: false });
  document.addEventListener('touchcancel', function () { finishPinch(); }, { passive: false });
  document.addEventListener('click', function (event) {
    if (pinch || Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('message', function (event) {
    var message = event.data;
    if (event.source !== window.parent || !message || message.channel !== config.channel || message.type !== 'fontSize') return;
    if (typeof message.value !== 'number' || !Number.isFinite(message.value) || pinch) return;
    applyFontSize(message.value, fontAnchor(window.innerWidth / 2, window.innerHeight / 2), false);
    if (!restoring) { lastValue = -1; report(); }
  });
  window.addEventListener('pagehide', finishPinch);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') finishPinch();
  });
