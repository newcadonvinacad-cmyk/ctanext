/**
 * TIỆN ÍCH PHÁT HÀNH MÃ CHỨNG TỪ NGUYÊN TỬ (ATOMIC NUMBER SEQUENCES)
 * Đảm bảo an toàn đa luồng, chống trùng lặp mã khi tạo chứng từ đồng thời
 * Sử dụng bảng erp.number_sequences trong Postgres.
 */

export async function getNextDocumentCode(
  client: any,
  orgId: string,
  documentType: string,
  prefix: string,
  periodKey?: string
): Promise<string> {
  const pKey = periodKey || new Date().toISOString().slice(0, 7).replace("-", "");
  const res = await client.query(
    `INSERT INTO erp.number_sequences (organization_id, document_type, period_key, next_value)
     VALUES ($1, $2, $3, 2)
     ON CONFLICT (organization_id, document_type, period_key)
     DO UPDATE SET next_value = erp.number_sequences.next_value + 1, updated_at = now()
     RETURNING next_value - 1 AS seq`,
    [orgId, documentType, pKey]
  );
  const seq = Number(res.rows[0].seq);
  return `${prefix}-${pKey}-${String(seq).padStart(4, "0")}`;
}
