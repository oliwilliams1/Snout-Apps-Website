const tab2: HTMLElement | null = document.getElementById('tab-2');
const segmentVisualiser: HTMLElement | null = document.getElementById('segmentVisualiser');

function renderTab(): void {
  const rect = tab2?.getBoundingClientRect();

  if (rect && segmentVisualiser) {
    segmentVisualiser.style.width = `${rect.width + 10}px`;
    segmentVisualiser.style.marginLeft = `${rect.left - 5}px`;
  }
}

const calendarEl: HTMLElement | null = document.getElementById('calendar');
let currentMonth: number = new Date().getMonth();
let currentYear: number = new Date().getFullYear();

function renderCalendar(month: number, year: number): void {
  if (calendarEl) {
    calendarEl.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'calendar-header';

    const monthName = document.createElement('h2');
    monthName.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const prevMonthButton = document.createElement('button');
    prevMonthButton.textContent = '<';
    prevMonthButton.onclick = () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar(currentMonth, currentYear);
    };

    const nextMonthButton = document.createElement('button');
    nextMonthButton.textContent = '>';
    nextMonthButton.onclick = () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar(currentMonth, currentYear);
    };

    header.appendChild(prevMonthButton);
    header.appendChild(monthName);
    header.appendChild(nextMonthButton);
    calendarEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayNames.forEach(day => {
      const dayElement = document.createElement('rect');
      dayElement.className = 'day day-name';
      dayElement.textContent = day;
      grid.appendChild(dayElement);
    });

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay.getDay();

    for (let i = 0; i < startDay; i++) {
      grid.appendChild(document.createElement('rect'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('rect');
      dayElement.className = 'day';
      dayElement.textContent = day.toString();
      grid.appendChild(dayElement);
    }

    calendarEl.appendChild(grid);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderTab();
  renderCalendar(currentMonth, currentYear);
});