import snowflake from 'snowflake-sdk';

let connection: any = null;

export function getSnowflakeConnection(){
    if(!connection){
        connection = snowflake.createConnection({
            account: process.env.SNOWFLAKE_ACCOUNT!, 
            username: process.env.SNOWFLAKE_USERNAME!,
            password: process.env.SNOWFLAKE_PASSWORD!,
            database: 'INTERVIEW_PREP',
            schema: 'INTERVIEW_DATA',
            warehouse: 'COMPUTE_WH', // Default warehouse
        });
    }
    return connection;
}

export async function executeQuery(query: string, binds: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {

        const conn = getSnowflakeConnection();
        
        if(!conn.isUp()){
            conn.connect((err:any)=>{
                if(err){
                    reject(err);
                    return;
                }
                runQuery();
            });
        }else{
            runQuery();
        }
        
        function runQuery(){
            conn.execute({
                sqlText:query,
                binds:binds,
                complete:(err:any,stmt:any,rows:any)=>{
                    if(err){
                        reject(err);
                    }else{
                        resolve(rows || []);
                    }
                }
            });
        }
    });
}