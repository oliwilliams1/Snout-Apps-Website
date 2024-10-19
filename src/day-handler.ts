const dayNameHtml = document.getElementById('dayName');
const dateHtml = document.getElementById('date');
const tab1 = document.getElementById('tab-1');
const segmentVisualiser = document.getElementById('segmentVisualiser');

function renderDay() {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    if (dayNameHtml && dateHtml) {
        dayNameHtml.innerHTML = dayName;
        dateHtml.innerHTML = date;
    }
}

function renderTab() {
    const rect = tab1?.getBoundingClientRect();

    if (rect && segmentVisualiser) {
        segmentVisualiser.style.width = `${rect.width + 10}px`;
        segmentVisualiser.style.marginLeft = `${rect.left - 5}px`;
    }
}

function render2() {
    renderDay();
    renderTab();
}

document.addEventListener('DOMContentLoaded', render2);