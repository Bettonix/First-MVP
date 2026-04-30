"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateAccessibilitySettings(theme: 'dark' | 'sunlight') {
  const cookieStore = await cookies();
  
  cookieStore.set('accessibility_settings', theme, {
    path: '/',
    maxAge: 31536000, // 1 year
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  revalidatePath('/');
  return { success: true, theme };
}
