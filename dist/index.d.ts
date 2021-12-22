interface PropsType {
    driver?: any;
    dbConfig: {
        host: string;
        port: string;
        database: string;
        user: string;
        password: string;
        connectionLimit?: number;
    };
    endReleaseType?: 'release' | 'end';
    returnOriginError?: boolean;
    returnOriginSource?: boolean;
    ssh?: {
        srcHost: string;
        srcPort: number;
        host: string;
        port: 36000;
        username: string;
        password: string;
    };
}
/**
 * sqlUtil
 */
declare class SqlUtil {
    props: PropsType;
    driver: PropsType["driver"];
    pool: any;
    returnOriginError: boolean;
    returnOriginSource: boolean;
    poolMd5: string;
    dbConfig: PropsType['dbConfig'];
    endReleaseType: any;
    format: any;
    escape: any;
    raw: any;
    escapeId: any;
    initSSHPromise: Promise<void>;
    connectionInitPromise: Promise<void>;
    sshConfig: PropsType['ssh'];
    ssh: any;
    SSHStreamList: any;
    sshMd5: string;
    constructor(props: PropsType);
    initSSH(props: any): Promise<void>;
    getSSHStream(): Promise<unknown>;
    setConnection(dbConfig?: any): Promise<void>;
    select({ fields, table, where, groupby, orderby, order, orders, limit, asSql, }: {
        fields?: any;
        table: string;
        where?: any;
        groupby?: string;
        orderby?: string;
        order?: string;
        orders?: any;
        limit?: {
            start: number | string;
            size: number | string;
        };
        asSql?: boolean;
    }): Promise<any>;
    find({ fields, table, where, groupby, orderby, order, orders, limit, asSql, }: {
        fields?: never[] | undefined;
        table?: string | undefined;
        where?: null | undefined;
        groupby?: string | undefined;
        orderby?: string | undefined;
        order?: string | undefined;
        orders?: null | undefined;
        limit?: {
            start: number;
            size: number;
        } | undefined;
        asSql?: boolean | undefined;
    }): Promise<any>;
    count({ field, table, where, asSql }: {
        field?: string | undefined;
        table?: string | undefined;
        where?: null | undefined;
        asSql?: boolean | undefined;
    }): Promise<any>;
    insert({ fields, table, data, asSql, }: {
        fields?: string[];
        table: string;
        data: string | string[] | Record<string, any>;
        asSql?: boolean;
    }): Promise<unknown>;
    update({ table, data, where, asSql }: {
        table?: string | undefined;
        data?: {} | undefined;
        where?: null | undefined;
        asSql?: boolean | undefined;
    }): Promise<any>;
    delete({ table, where, asSql }: {
        table?: string | undefined;
        where?: null | undefined;
        asSql?: boolean | undefined;
    }): Promise<unknown>;
    join({ leftTable, rightTable, leftFields, rightFields, joinCondition, where, groupby, orderby, order, orders, limit, total, asSql, }: {
        leftTable?: string | undefined;
        rightTable?: string | undefined;
        leftFields?: never[] | undefined;
        rightFields?: never[] | undefined;
        joinCondition?: string | undefined;
        where?: null | undefined;
        groupby?: string | undefined;
        orderby?: string | undefined;
        order?: string | undefined;
        orders?: null | undefined;
        limit?: null | undefined;
        total?: boolean | undefined;
        asSql?: boolean | undefined;
    }): Promise<unknown>;
    /**
     * @return {string}
     */
    getSelectFields(fields?: never[]): string;
    getWhereCondition(where?: null): string;
    query(sql?: string, returnRes?: boolean): Promise<unknown>;
    beginTransaction(queryList?: never[], showlog?: boolean): Promise<unknown>;
    connectionQuery(connection: any, sql: any, showlog?: boolean): Promise<unknown>;
    runTransaction(run: (opt: {
        sqlUtil: SqlUtil;
        rollback: (res: ReturnType<SqlUtil['handleRes']>) => void;
        commit: () => void;
    }) => Promise<void>, showlog?: boolean): Promise<unknown>;
    resolveConnectFail(resolve: any, error: any, message?: string): void;
    resolveQueryFail(resolve: any, error: any, message?: string): void;
    resolveTransationFail(resolve: any, error: any, message?: string): void;
    resolveCommitFail(resolve: any, error: any, message?: string): void;
    getMd5(text?: string): any;
    replaceDangerChar(word?: string): string;
    handleRes(code?: number, message?: string, obj?: {}): {
        code: number;
        subcode: number;
        message: string;
        default: number;
        data: never[];
    };
    releaseConnection(conn?: any): void;
    getOrderby(_orders: any): any;
}
export default SqlUtil;
