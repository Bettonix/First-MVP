import { getProdutosPDV } from "@/app/actions/produtos";

import { Package, Plus } from "lucide-react";

// Força o Server Component a ser dinâmico ou revalidado
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProdutosBackoffice() {
  const produtos = await getProdutosPDV(); // Em um real, você teria um getProdutosAll(tenantId)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 flex items-center gap-2">
            <Package size={32} className="text-blue-600" />
            Gestão de Produtos
          </h1>
          <p className="text-neutral-500 mt-1">Gerencie o catálogo, preços e estoque do seu negócio.</p>
        </div>
        
        {/* Futuro: Componente Client que abre o ProductForm completo num Modal/Sheet */}
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
        {produtos.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-4 font-semibold text-sm text-neutral-500 uppercase tracking-wider">Nome do Produto</th>
                <th className="p-4 font-semibold text-sm text-neutral-500 uppercase tracking-wider">Preço</th>
                <th className="p-4 font-semibold text-sm text-neutral-500 uppercase tracking-wider">Estoque</th>
                <th className="p-4 font-semibold text-sm text-neutral-500 uppercase tracking-wider">Status (PDV)</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="p-4 font-medium text-neutral-900">{produto.nome}</td>
                  <td className="p-4 text-green-700 font-semibold">
                    {(produto.precoCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      produto.estoqueAtual > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {produto.estoqueAtual} unid.
                    </span>
                  </td>
                  <td className="p-4">
                    {produto.isFavorito ? (
                      <span className="text-blue-600 text-sm font-semibold">Visível no PDV</span>
                    ) : (
                      <span className="text-neutral-400 text-sm">Oculto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
