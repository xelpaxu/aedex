// Type bridge to the backend configured in vecpro/convex.json.
// Runtime function references remain in api.js; regenerate the canonical backend
// types from vecpro rather than generating an empty API from the mobile folder.
export { api, internal, components } from '../../../aedify/convex/_generated/api';
