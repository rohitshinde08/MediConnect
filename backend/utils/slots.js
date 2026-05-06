const generateSlots = (startTime, endTime, duration) => {
    const slots = [];
    let current = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);

    while (current < end) {
        const next = new Date(current.getTime() + duration * 60000);
        if (next > end) break;

        const timeStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        slots.push(timeStr);
        current = next;
    }
    return slots;
};

module.exports = { generateSlots };
