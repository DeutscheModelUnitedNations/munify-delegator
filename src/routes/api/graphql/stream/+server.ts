import { yoga } from '$api/yoga';

// graphql-sse's single connection mode: PUT reserves a stream, GET holds it open, POST starts an
// operation on it and DELETE stops one. All four have to reach the instance holding the reservation.
export { yoga as GET, yoga as POST, yoga as PUT, yoga as DELETE, yoga as OPTIONS };
