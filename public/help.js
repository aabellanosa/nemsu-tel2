const searchInput = document.querySelector("#helpSearch");
const searchStatus = document.querySelector("#searchStatus");
const topics = [...document.querySelectorAll(".help-topic")];
const noResults = document.querySelector("#noResults");
const checklistKey = "nemsu-help-practice-checklist";

function filterTopics() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  topics.forEach((topic) => {
    const searchableText = `${topic.dataset.search || ""} ${topic.textContent}`.toLowerCase();
    const matches = !query || searchableText.includes(query);
    topic.hidden = !matches;
    if (matches) visible += 1;
  });
  noResults.hidden = visible !== 0;
  searchStatus.textContent = query ? `${visible} help ${visible === 1 ? "topic" : "topics"} found` : "";
}

searchInput.addEventListener("input", filterTopics);
document.querySelector("#clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  filterTopics();
  searchInput.focus();
});
document.querySelector("#printHelp").addEventListener("click", () => window.print());

const checkboxes = [...document.querySelectorAll(".checklist input")];
try {
  const saved = JSON.parse(localStorage.getItem(checklistKey) || "[]");
  checkboxes.forEach((checkbox, index) => { checkbox.checked = Boolean(saved[index]); });
} catch {
  localStorage.removeItem(checklistKey);
}
checkboxes.forEach((checkbox) => checkbox.addEventListener("change", () => {
  localStorage.setItem(checklistKey, JSON.stringify(checkboxes.map((item) => item.checked)));
}));
