
import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';

const USERS_STORE = 'users_auth_store';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, username, mobile, password } = await request.json();

    if (!firstName || !lastName || !username || !mobile || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }
     if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }


    const store = getStore(USERS_STORE);
    
    let users = [];
    try {
        const data = await store.get('users', { type: 'json' });
        if (Array.isArray(data)) {
            users = data;
        }
    } catch(e) {
        // If the blob doesn't exist, it's fine. We'll create it.
    }

    if (users.some(u => u.username === username)) {
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
    }

    // In a real app, you would hash the password here using a library like bcrypt
    // const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      username,
      mobile,
      password, // Storing plain text password - NOT FOR PRODUCTION
    };

    users.push(newUser);

    await store.setJSON('users', users);

    // Don't send the password back
    const { password: _, ...userToReturn } = newUser;

    return NextResponse.json(userToReturn, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Signup failed', error: message }, { status: 500 });
  }
}

    