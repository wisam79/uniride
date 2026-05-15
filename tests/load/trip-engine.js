import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const responseTime = new Trend('trip_engine_response_time');
const errorRate = new Rate('trip_engine_errors');

export const options = {
  vus: 50,
  duration: '60s',
  thresholds: {
    trip_engine_response_time: ['p(95)<500'],
    trip_engine_errors: ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = __ENV.K6_BASE_URL;
  const TOKEN = __ENV.K6_SERVICE_ROLE_KEY;

  if (!BASE_URL || !TOKEN) {
    console.error('K6_BASE_URL and K6_SERVICE_ROLE_KEY must be set');
    return;
  }

  const payload = JSON.stringify({
    tripId: '00000000-0000-0000-0000-000000000001',
    newStatus: 'driver_waiting',
    lat: 33.3152,
    lng: 44.3661,
  });

  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'idempotency-key': `k6-${__VU}-${__ITER}`,
    },
  };

  const res = http.post(`${BASE_URL}/functions/v1/trip-engine`, payload, params);

  responseTime.add(res.timings.duration);

  const success = check(res, {
    'status is 200, 400, or 429': (r) => [200, 400, 429].includes(r.status),
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
  sleep(0.1);
}
