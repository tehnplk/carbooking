import assert from 'node:assert/strict';

import { buildMophNotifyUrl, pushBookingCreatedMophNotifyMessage, sendMophNotify } from './moph-notify';

async function assertMophNotifyClientContract() {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  };

  const result = await sendMophNotify(
    {
      messages: [{ type: 'text', text: 'hello' }],
    },
    {
      clientKey: 'client',
      secretKey: 'secret',
      fetcher,
    },
  );

  result.ok satisfies boolean;
  calls[0].input satisfies string | URL | Request;
  calls[0].init?.headers satisfies HeadersInit | undefined;

  assert.equal(result.ok, true);
  assert.equal(calls[0].input, 'https://morpromt2f.moph.go.th/api/notify/send');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(calls[0].init?.headers, {
    'Content-Type': 'application/json',
    'client-key': 'client',
    'secret-key': 'secret',
  });
  assert.equal(calls[0].init?.body, JSON.stringify({ messages: [{ type: 'text', text: 'hello' }] }));
}

async function assertMophNotifyClientIdEnvFallback() {
  const originalClientKey = process.env.MOPH_NOTIFY_CLIENT_KEY;
  const originalClientId = process.env.MOPH_NOTIFY_CLIENT_ID;
  const originalSecretKey = process.env.MOPH_NOTIFY_SECRET_KEY;
  const calls: Array<{ init?: RequestInit }> = [];

  delete process.env.MOPH_NOTIFY_CLIENT_KEY;
  process.env.MOPH_NOTIFY_CLIENT_ID = 'env-client-id';
  process.env.MOPH_NOTIFY_SECRET_KEY = 'env-secret';

  try {
    await sendMophNotify(
      {
        messages: [{ type: 'text', text: 'hello' }],
      },
      {
        fetcher: async (_input, init) => {
          calls.push({ init });
          return new Response(null, { status: 204 });
        },
      },
    );

    assert.deepEqual(calls[0].init?.headers, {
      'Content-Type': 'application/json',
      'client-key': 'env-client-id',
      'secret-key': 'env-secret',
    });
  } finally {
    if (originalClientKey === undefined) delete process.env.MOPH_NOTIFY_CLIENT_KEY;
    else process.env.MOPH_NOTIFY_CLIENT_KEY = originalClientKey;

    if (originalClientId === undefined) delete process.env.MOPH_NOTIFY_CLIENT_ID;
    else process.env.MOPH_NOTIFY_CLIENT_ID = originalClientId;

    if (originalSecretKey === undefined) delete process.env.MOPH_NOTIFY_SECRET_KEY;
    else process.env.MOPH_NOTIFY_SECRET_KEY = originalSecretKey;
  }
}

async function assertBookingCreatedMophNotifyUsesFlexMessage() {
  const calls: Array<{ init?: RequestInit }> = [];
  const result = await pushBookingCreatedMophNotifyMessage(
    {
      id: 123,
      destination: 'Hospital',
      purpose: 'Meeting',
      distance: 10,
      passengers: 2,
      start_date: '2026-06-17',
      start_time: '09:00',
      end_date: '2026-06-17',
      end_time: '10:00',
      requester_name: 'Tester',
      requester_position: 'IT',
      department_name: 'Admin',
      created_at: '2026-06-17T08:00:00.000Z',
    },
    {
      clientKey: 'client',
      secretKey: 'secret',
      fetcher: async (_input, init) => {
        calls.push({ init });
        return new Response(JSON.stringify({ status: 200, message: 'Succesfully' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      },
    },
  );

  const body = JSON.parse(String(calls[0].init?.body));

  assert.equal(result.ok, true);
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].type, 'flex');
  assert.equal(body.messages[0].contents.type, 'bubble');
}

assert.equal(buildMophNotifyUrl(), 'https://morpromt2f.moph.go.th/api/notify/send');
void assertMophNotifyClientContract();
void assertMophNotifyClientIdEnvFallback();
void assertBookingCreatedMophNotifyUsesFlexMessage();
