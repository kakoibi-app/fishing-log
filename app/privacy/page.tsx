export default function Privacy() {
  return (
    <div className="p-6 max-w-2xl mx-auto text-sm">
      <h1 className="text-xl font-bold mb-4">プライバシーポリシー</h1>

      <p className="mb-3">
        本サービスでは以下の情報を取得します。
      </p>

      <ul className="list-disc ml-5 space-y-2">
        <li>Googleアカウント情報</li>
        <li>位置情報</li>
        <li>入力された釣果データ</li>
      </ul>

      <p className="mt-4">
        これらの情報はサービス提供の目的のみに使用し、
        第三者に提供することはありません。
      </p>

      <p className="mt-4 text-xs text-gray-500">
        問い合わせ: kakoibi.official@gmail.com
      </p>
    </div>
  );
}
``