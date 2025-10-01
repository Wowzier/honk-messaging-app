import { NextResponse } from 'next/server';

const MESSAGE =
  'Email/password login has been retired. Courier IDs are issued automatically via the seamless device auth flow.';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: MESSAGE,
    },
    { status: 410 }
  );
}
