import { createClient } from '@supabase/supabase-js'
import { config } from '../config';

export function supabaseAdmin(){
    try{
        return createClient(
           config.supabase_url!, 
           config.supabase_secret!
       )
   }catch(e){
       console.log(e);
       console.log("SUPABASE_URL "+ config.supabase_url);
       throw new Error("Can't initialize supabase");
   }
}