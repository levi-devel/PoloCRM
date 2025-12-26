// Milvus API Types
export interface MilvusClient {
    id: number;
    razao_social: string;
    nome_fantasia: string;
    cnpj_cpf: string;
    is_ativo: boolean;
    observacao?: string;
}

export interface MilvusClientListResponse {
    lista: MilvusClient[];
}
