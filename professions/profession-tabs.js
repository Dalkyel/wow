const professionTabList = document.querySelector(".profession-tabs");
const professionTabs = Array.from(professionTabList.querySelectorAll('[role="tab"]'));

function selectProfession(tab) {
  for (const button of professionTabs) {
    const selected = button === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    document.getElementById(button.getAttribute("aria-controls")).hidden = !selected;
  }
}

professionTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectProfession(tab));
  tab.addEventListener("keydown", event => {
    let next;
    switch (event.key) {
      case "ArrowLeft":
        next = (index - 1 + professionTabs.length) % professionTabs.length;
        break;
      case "ArrowRight":
        next = (index + 1) % professionTabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = professionTabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectProfession(professionTabs[next]);
    professionTabs[next].focus();
  });
});
