import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid'; // Import the timeGrid plugin

document.addEventListener('DOMContentLoaded', () => {
    var calendarEl = document.getElementById('calendar');

    if (calendarEl) {
        var calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin], // Include both dayGrid and timeGrid plugins
            initialView: 'dayGridMonth', // Set the initial view
            initialDate: '2024-10-07',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay' // Add week and day views to the toolbar
            },
        });
        calendar.render();
    } else {
        console.error('Calendar element not found');
    }
});