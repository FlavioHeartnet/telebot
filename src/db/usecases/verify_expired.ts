import dayjs from 'dayjs';
import { supabaseAdmin } from "../supabase";

export default async function isExpired(telegram_id: number) {

  const resp = await supabaseAdmin().from("payments").select("expire_in").eq(
    "telegram_id",
    telegram_id,
  ).eq("payment_status", "accredited");
  if (resp.data) {
    const latestDate = resp.data.reduce((latest, current) => {
        const currentDate = dayjs(current.expire_in);
        return !latest || currentDate.isAfter(latest) 
            ? currentDate 
            : latest;
    }, null as dayjs.Dayjs | null);
    if (!latestDate) {
        return { 
            isExpired: false, 
            latestDate: null 
        };
    }
    const now = dayjs();
    const expiration = dayjs(latestDate);
    
    return now.isAfter(expiration);
  }
}
