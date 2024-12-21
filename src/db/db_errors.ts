import { PostgrestError } from "@supabase/supabase-js";

export function dbErrorsCheck(error: PostgrestError | null){
    if(error){
        console.log(error);
    }
}