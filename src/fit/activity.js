import { profiles } from './profiles/profiles.js';

const fitEpochOffset = 631065600;

function toFitTimestamp(timestamp) {
    return Math.floor(timestamp / 1000) - fitEpochOffset;
}

function dataMessage(message, local_number, fields) {
    return {
        type: 'data',
        message,
        local_number,
        fields,
    };
}

function FileId(args = {}) {
    return dataMessage('file_id', 0, {
        time_created: toFitTimestamp(args.time_created ?? Date.now()),
        manufacturer: 255,
        product: 0,
        number: 0,
        type: 4,
    });
}

function Event(args = {}) {
    return dataMessage('event', 2, {
        timestamp: toFitTimestamp(args.timestamp),
        event: profiles.types.event.values.timer,
        event_type: args.event_type ?? profiles.types.event_type.values.stop,
        event_group: 0,
    });
}

function Activity(args = {}) {
    return dataMessage('activity', 6, {
        timestamp: toFitTimestamp(args.timestamp),
        local_timestamp: 0,
        num_sessions: 1,
        type: profiles.types.activity.values.manual,
        event: profiles.types.event.values.activity,
        event_type: profiles.types.event_type.values.stop,
    });
}

const activity = Object.freeze({
    toFitTimestamp,
    FileId,
    Event,
    Activity,
});

export { activity };