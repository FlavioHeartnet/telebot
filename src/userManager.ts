interface UserData {
  email?: string;
  currentField?: "email" | "cpf";
  payment_id?: number;
  telegram_id?: number;
  botId?: number;
}

export class UserManager {
  private userDataMap: Map<number, UserData> = new Map();

  public setUserData(chatId: number, userData: UserData): void {
    this.userDataMap.set(chatId, userData);
  }

  public getUserData(chatId: number): UserData | undefined {
    return this.userDataMap.get(chatId);
  }

  public deleteUserData(chatId: number): void {
    this.userDataMap.delete(chatId);
  }
}