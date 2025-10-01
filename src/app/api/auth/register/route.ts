import { NextResponse } from 'next/server';

const MESSAGE =
  'Manual registration has been retired. Each visitor receives a courier ID automatically through the seamless auth flow.';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: MESSAGE,
    },
    { status: 410 }
  );
}
