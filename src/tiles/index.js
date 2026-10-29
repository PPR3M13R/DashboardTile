import NoteTile from "./NoteTile";
import TimeTile from "./TimeTile";
import WeatherTile from "./WeatherTile";
import CalendarTile from "./CalendarTile";

export const TILE_TYPES = {
    note: { label: "Quick Note", component: NoteTile },
    time: { label: "Time", component: TimeTile },
    weather: { label: "Weather", component: WeatherTile },  
    calendar: { label: "Calendar", component: CalendarTile },
};