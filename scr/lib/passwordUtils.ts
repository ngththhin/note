export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE = "Mật khẩu phải dài tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }
  return { valid: true };
}
