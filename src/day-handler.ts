const dayNameHtml = document.getElementById('dayName');
const dateHtml = document.getElementById('date');

function renderDay() {
    console.log("Rendering day...");
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    if (dayNameHtml && dateHtml) {
        dayNameHtml.innerHTML = dayName;
        dateHtml.innerHTML = date;
    }
}

document.addEventListener('DOMContentLoaded', renderDay);