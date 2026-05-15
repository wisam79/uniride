import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const responseTime = new Trend('activate_license_response_time');
const errorRate = new Rate('activate_license_errors');

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    activate_license_response_time: ['p(95)<1000'],
    // rate_limit_exceeded (429) is expected and excluded from error rate
    activate_license_errors: ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = __ENV.K6_BASE_URL;
  const TOKEN = __ENV.K6_SERVICE_ROLE_KEY;

  if (!BASE_URL || !TOKEN) {
    console.error('K6_BASE_URL and K6_SERVICE_ROLE_KEY must be set');
    return;
  }

  // Unique license code per VU per iteration to avoid conflicts
  const licenseCode = `TEST-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    p_code: licenseCode,
  });

  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      apikey: TOKEN,
    },
  };

  const res = http.post(`${BASE_URL}/rest/v1/rpc/activate_license`, payload, params);

  responseTime.add(res.timings.duration);

  // 429 = rate_limit_exceeded — expected, not an error
  const isRateLimit = res.status === 429;
  const isExpectedResponse = check(res, {
    'status is 200, 400, or 429': (r) => [200, 400, 429].includes(r.status),
  });

  errorRate.add(!isExpectedResponse && !isRateLimit);
  sleep(0.2);
}
