// Homepage featured carousel.

function renderFeaturedCarousel(images) {
  if (!dom.homeCarousel || !dom.carouselTrack || !dom.carouselDots) return;

  const featured = images.filter((img) => img.is_featured);
  const slides = featured.length ? featured : images;

  dom.carouselTrack.innerHTML = "";
  dom.carouselDots.innerHTML = "";

  if (!slides.length) return;

  let currentIndex = 0;
  let autoTimer = null;
  let touchStartX = 0;

  slides.forEach((image, i) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide" + (i === 0 ? " is-active" : "");

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt || "";
    img.loading = i === 0 ? "eager" : "lazy";
    img.decoding = "async";
    applyLightboxData(img, image);
    img.addEventListener("load", () => {
      refreshLightboxItems();
      if (i === currentIndex) fitCarouselToImage(img);
    });
    img.addEventListener("error", () => {
      img.dataset.broken = "true";
      refreshLightboxItems();
    });

    slide.appendChild(img);
    slide.addEventListener("click", () => {
      if (img.dataset.broken === "true") return;
      openLightboxByImageNode(img);
    });
    dom.carouselTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "carousel-dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
    dot.type = "button";
    dot.addEventListener("click", () => {
      goToSlide(i);
      startAuto();
    });
    dom.carouselDots.appendChild(dot);
  });

  refreshLightboxItems();

  function fitCarouselToImage(img) {
    if (!img || !dom.homeCarousel) return;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const w = dom.homeCarousel.offsetWidth || window.innerWidth;
    const ratio = img.naturalWidth / img.naturalHeight;
    const h = Math.round(Math.max(180, Math.min(w / ratio, window.innerHeight * 0.9)));
    dom.homeCarousel.style.height = h + "px";
  }

  function goToSlide(index) {
    dom.carouselTrack.children[currentIndex]?.classList.remove("is-active");
    dom.carouselDots.children[currentIndex]?.classList.remove("is-active");
    currentIndex = ((index % slides.length) + slides.length) % slides.length;
    dom.carouselTrack.children[currentIndex]?.classList.add("is-active");
    dom.carouselDots.children[currentIndex]?.classList.add("is-active");
    const activeImg = dom.carouselTrack.children[currentIndex]?.querySelector("img");
    if (activeImg?.complete && activeImg.naturalWidth) {
      fitCarouselToImage(activeImg);
    }
  }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goToSlide(currentIndex + 1), 4500);
  }

  dom.carouselPrev?.addEventListener("click", () => {
    goToSlide(currentIndex - 1);
    startAuto();
  });
  dom.carouselNext?.addEventListener("click", () => {
    goToSlide(currentIndex + 1);
    startAuto();
  });

  dom.homeCarousel.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  dom.homeCarousel.addEventListener("touchend", (event) => {
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 48) {
      goToSlide(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
      startAuto();
    }
  }, { passive: true });

  dom.homeCarousel.addEventListener("mouseenter", () => clearInterval(autoTimer));
  dom.homeCarousel.addEventListener("mouseleave", startAuto);

  window.addEventListener("resize", () => {
    const activeImg = dom.carouselTrack.children[currentIndex]?.querySelector("img");
    if (activeImg?.naturalWidth) fitCarouselToImage(activeImg);
  }, { passive: true });

  startAuto();
}
