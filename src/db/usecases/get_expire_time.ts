export function getTimeToExpire(period: number){

    if(period === 0){
        return null
    } else{
        return new Date(new Date().setDate(new Date().getDate() + 30*period))
    }
}