
import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';

const USERS_STORE = 'users_auth_store';

// A very simple and insecure password check.
// In a real app, use a library like bcrypt to hash and compare passwords.
const checkPassword = (plain: string, stored: string) => plain === stored;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    const store = getStore(USERS_STORE);
    
    let users = [];
    try {
        users = await store.get('users', { type: 'json' });
    } catch (e) {
        // users blob doesn't exist yet
    }

    if (!Array.isArray(users)) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = users.find(u => u.username === username);

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // In a real app, you would use bcrypt.compare()
    const isPasswordValid = checkPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Don't send the password back to the client
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json(userWithoutPassword);

    // Set a cookie to manage session
    response.cookies.set('user', JSON.stringify(userWithoutPassword), {
        httpOnly: true, // makes it inaccessible to client-side JS
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
    });

    return response;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Login failed', error: message }, { status: 500 });
  }
}

    