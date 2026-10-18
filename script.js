
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const startShare = $("#startShare");
const connectBtn = $("#connectBtn");
const stopShare = $("#stopShare");
const screenVideo = $("#screenVideo");
const emptyState = $("#emptyState");
const previewOverlay = $("#previewOverlay");
const previewTag = $("#previewTag");
const previewText = $("#previewText");
const previewDot = $("#previewDot");
const topStatus = $("#topStatus");
const toast = $("#toast");

let currentStream = null;
let selectedDevice = "android";
let selectedMethod = "usb";
let toastTimeout;

const connectionHelp = {
  android: {
    usb: {
      title: "Android telefonni USB orqali ulash",
      description: "Telefonni USB kabel bilan kompyuterga ulang va ekran aks ettirish dasturida oching. Keyin Ekranni ulash tugmasi orqali o‘sha oynani tanlang.",
      guide: "Telefonni USB kabel bilan ulang. scrcpy kabi vosita Android ekranini kompyuterda ko‘rsatishi mumkin. So‘ng brauzerda aks ettirilgan oynani tanlang.",
      link: "https://github.com/Genymobile/scrcpy"
    },
    wifi: {
      title: "Android telefonni simsiz ulash",
      description: "Telefon va kompyuterda mos simsiz aks ettirish vositasini ishga tushiring. Ekran kompyuterda paydo bo‘lgach, uni brauzerda tanlang.",
      guide: "Ikkala qurilmada mos simsiz ekran uzatish vositasini sozlang. Telefon ekrani kompyuterda ko‘ringach, brauzerda o‘sha oynani tanlang.",
      link: "https://support.microsoft.com/windows"
    },
    browser: {
      title: "Kompyuter oynasini tanlash",
      description: "Telefon tasviri avval kompyuterda ochilgan bo‘lishi kerak. Keyin brauzerda Ekranni ulash tugmasini bosing va kerakli oynani tanlang.",
      guide: "Brauzer o‘zi telefonni topmaydi. Avval telefon ekranini kompyuterda aks ettiring, keyin brauzerda shu oyna yoki ekranni tanlang.",
      link: "https://github.com/Genymobile/scrcpy"
    }
  },
  iphone: {
    usb: {
      title: "iPhone’ni kabel orqali ulash",
      description: "iPhone’ni kompyuterga ulang va mos ekran aks ettirish vositasida oching. Keyin brauzer orqali o‘sha oynani tanlang.",
      guide: "Windows’da iPhone ekranini ko‘rsatish uchun mos vosita kerak bo‘lishi mumkin. Tasvir kompyuterda paydo bo‘lgach, brauzerda uni tanlang.",
      link: "https://support.apple.com/"
    },
    wifi: {
      title: "iPhone’ni simsiz ulash",
      description: "Mos simsiz qabul qiluvchi vositani kompyuterda ishga tushiring. iPhone’dagi Screen Mirroring imkoniyatidan foydalanib, tasvirni kompyuterga uzating.",
      guide: "Simsiz ekran uzatish imkoniyati kompyuter va qurilmaga bog‘liq. iPhone ekranini qabul qiluvchi mos vositani ishga tushiring, keyin oynani tanlang.",
      link: "https://support.apple.com/"
    },
    browser: {
      title: "iPhone ekranini brauzerda ko‘rish",
      description: "iPhone ekrani avval kompyuterda aks ettirilgan bo‘lsin. Ekranni ulash tugmasini bosib, shu tasvir turgan oynani tanlang.",
      guide: "Brauzer iPhone’ga bevosita ulanmaydi. Telefon tasvirini kompyuterda ko‘rsatuvchi mos vositani sozlab, keyin oynani tanlang.",
      link: "https://support.apple.com/"
    }
  }
};

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function updateHelp() {
  const help = connectionHelp[selectedDevice][selectedMethod];

  $("#connectionDescription").textContent = help.description;
  $("#guideTitle").textContent = help.title;
  $("#guideText").textContent = help.guide;
  $("#guideLink").href = help.link;

  $$(".device-tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.device === selectedDevice
    );
  });

  $$(".method-option").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.method === selectedMethod
    );
  });
}

function setConnected(connected) {
  emptyState.classList.toggle("hidden", connected);
  screenVideo.classList.toggle("hidden", !connected);
  previewOverlay.classList.toggle("hidden", !connected);
  startShare.classList.toggle("hidden", connected);
  stopShare.classList.toggle("hidden", !connected);

  previewTag.classList.toggle("connected", connected);
  previewTag.innerHTML = connected
    ? "<i></i> CONNECTED"
    : "<i></i> OFFLINE";

  previewDot.classList.toggle("active", connected);
  previewText.textContent = connected
    ? "Ekran uzatilmoqda"
    : "Ekran tanlanmagan";

  topStatus.textContent = connected
    ? "Ekran ulangan"
    : "Ulanish kutilmoqda";
}

async function startScreenShare() {
  if (currentStream) {
    notify("Ekran allaqachon uzatilmoqda.");
    return;
  }

  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getDisplayMedia !== "function"
  ) {
    notify(
      "Ekran ulash ishlamadi. Sahifani Chrome yoki Edge’da localhost yoki HTTPS orqali oching."
    );
    return;
  }

  startShare.disabled = true;
  connectBtn.disabled = true;
  startShare.textContent = "Oyna tanlanmoqda...";
  connectBtn.textContent = "Oyna tanlanmoqda...";

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    });

    currentStream = stream;
    screenVideo.srcObject = stream;

    await screenVideo.play();
    setConnected(true);
    notify("Ekran muvaffaqiyatli ulandi.");

    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.addEventListener("ended", () => {
        stopScreenShare(false);
      }, { once: true });
    }
  } catch (error) {
    if (error.name === "NotAllowedError") {
      notify("Ulash bekor qilindi yoki ekran ulashga ruxsat berilmadi.");
    } else if (error.name === "NotFoundError") {
      notify("Tanlash uchun ekran yoki oyna topilmadi.");
    } else {
      console.error("ScreenLink error:", error);
      notify("Ulashda xatolik yuz berdi. Brauzer ruxsatlarini tekshiring.");
    }
  } finally {
    startShare.disabled = false;
    connectBtn.disabled = false;
    startShare.innerHTML = "<span>▣</span> Ekranni tanlash <b>↗</b>";
    connectBtn.innerHTML = "<span>▣</span> Ekranni ulash <b>↗</b>";
  }
}

function stopScreenShare(showNotice = true) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  screenVideo.pause();
  screenVideo.srcObject = null;

  setConnected(false);

  if (showNotice) {
    notify("Ekran uzatish to‘xtatildi.");
  }
}

startShare.addEventListener("click", startScreenShare);
connectBtn.addEventListener("click", startScreenShare);
stopShare.addEventListener("click", () => stopScreenShare());

$$(".device-tab").forEach(button => {
  button.addEventListener("click", () => {
    selectedDevice = button.dataset.device;
    updateHelp();
    notify(
      selectedDevice === "android"
        ? "Android qurilmasi tanlandi."
        : "iPhone qurilmasi tanlandi."
    );
  });
});

$$(".method-option").forEach(button => {
  button.addEventListener("click", () => {
    selectedMethod = button.dataset.method;
    updateHelp();

    const methodNames = {
      usb: "USB kabel",
      wifi: "Wi-Fi / simsiz ulanish",
      browser: "Brauzer oynasi"
    };

    notify(methodNames[selectedMethod] + " tanlandi.");
  });
});

async function toggleFullscreen() {
  const target = $("#previewArea");

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (target.requestFullscreen) {
      await target.requestFullscreen();
    } else {
      notify("Bu brauzer to‘liq ekran rejimini qo‘llamaydi.");
    }
  } catch (error) {
    console.error("Fullscreen error:", error);
    notify("To‘liq ekran ochilmadi.");
  }
}

$("#fullscreenBtn").addEventListener("click", toggleFullscreen);
$("#videoFullscreen").addEventListener("click", toggleFullscreen);

$("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  const light = document.body.classList.contains("light-mode");
  $("#themeBtn").textContent = light ? "☾" : "☼";
  notify(light ? "Yorug‘ rejim yoqildi." : "Qorong‘i rejim yoqildi.");
});

$$(".nav-item").forEach(link => {
  link.addEventListener("click", () => {
    $$(".nav-item").forEach(item => item.classList.remove("active"));
    link.classList.add("active");
  });
});

$("#year").textContent = new Date().getFullYear();

window.addEventListener("beforeunload", () => {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
});

updateHelp();
setConnected(false);
