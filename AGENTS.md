# CCAGI Agents

このプロジェクトで利用可能なエージェント一覧。
各エージェントはCCAGI MCPサーバーを通じて実行されます。

| Agent | Description | 実行方法 |
|-------|-------------|----------|
| ai-product-analyzer | GitHubリポジトリからAIプロダクトを分析・抽出するAgent | `agent_run(name: "ai-product-analyzer")` |
| aiproductanalyzer | GitHubリポジトリからAIプロダクトを分析・抽出するAgent | `agent_run(name: "aiproductanalyzer")` |
| api | RESTful/GraphQL API設計・OpenAPI仕様・バージョニング管理の専門Agent | `agent_run(name: "api")` |
| architecture | システム設計・技術選定・スケーラビリティ設計の専門Agent | `agent_run(name: "architecture")` |
| aws-agent | AWS Agent - Cloud Infrastructure Management, Budget/Cost Management, Cost Estimation, Resource Optimization. Enterprise tier。 .ccagi/knowledge/ からAWSサービスカタログ・料金・re:Invent情報を参照。 CCI活用でコードベースのAWS利用実態を調査（fallback: grep）。 | `agent_run(name: "aws-agent")` |
| aws | AWS Agent - Cloud Infrastructure Management, Budget/Cost Management, Cost Estimation, Resource Optimization. Enterprise tier。 .ccagi/knowledge/ からAWSサービスカタログ・料金・re:Invent情報を参照。 CCI活用でコードベースのAWS利用実態を調査（fallback: grep）。 | `agent_run(name: "aws")` |
| backend | サーバーサイドロジック・API実装・データ処理の専門Agent | `agent_run(name: "backend")` |
| batch-issue | GitHub Issue一括作成Agent - テンプレートからバッチ作成 + Headless実行対応 | `agent_run(name: "batch-issue")` |
| batchissue | GitHub Issue一括作成Agent - テンプレートからバッチ作成 + Headless実行対応 | `agent_run(name: "batchissue")` |
| browser-automation | Platform-aware browser automation agent. Detects available browser backend (browser-cli vs Playwright), manages session state, handles retries, and orchestrates multi-tab browser workflows. | `agent_run(name: "browser-automation")` |
| ci-controller | CI/CD 操作を統括する Controller Agent。GitHub Actions workflow / runner management / PR merge / deploy orchestration を 7-invariant matrix で gate。 deployment, devops, deploy-infra, ci-runner-mgmt 4 specialist を society として lead。 既存 PIL pipelines (preview-release, stable-release) 経由実行を強制。 | `agent_run(name: "ci-controller")` |
| ci-runner-mgmt | Self-hosted GitHub Actions runner の health monitoring + capacity management + deploy/scale operation を担当する specialist。CIControllerAgent (継控) の society 配下。 gpuserver runner (192.168.10.207) Docker-based 3-container deploy の継続運用。 | `agent_run(name: "ci-runner-mgmt")` |
| codegen | AI駆動コード生成Agent - Claude Sonnet 4による自動コード生成 | `agent_run(name: "codegen")` |
| codex-codegen | OpenAI Codex駆動コード生成Agent | `agent_run(name: "codex-codegen")` |
| codex-docs | OpenAI Codex駆動ドキュメントAgent | `agent_run(name: "codex-docs")` |
| codex-refactor | OpenAI Codex駆動リファクタリングAgent | `agent_run(name: "codex-refactor")` |
| codex-test | OpenAI Codex駆動テストAgent | `agent_run(name: "codex-test")` |
| codexcodegen | OpenAI Codex駆動コード生成Agent | `agent_run(name: "codexcodegen")` |
| codexdocs | OpenAI Codex駆動ドキュメントAgent | `agent_run(name: "codexdocs")` |
| codexrefactor | OpenAI Codex駆動リファクタリングAgent | `agent_run(name: "codexrefactor")` |
| codextest | OpenAI Codex駆動テストAgent | `agent_run(name: "codextest")` |
| coordinator | タスク統括・並行実行制御Agent - DAGベースの自律オーケストレーション。複合タスクはIssue起票必須、チェックポイント駆動で実行。タスク分解はアウトカム単位(IC-3 Scope Fidelity準拠)。 | `agent_run(name: "coordinator")` |
| database | スキーマ設計・マイグレーション・クエリ最適化の専門Agent | `agent_run(name: "database")` |
| deploy-infra | AWS Infrastructure Auto-Setup Agent - Uses shared infrastructure (ALB, S3, CloudFront) | `agent_run(name: "deploy-infra")` |
| deployinfra | AWS Infrastructure Auto-Setup Agent - Uses shared infrastructure (ALB, S3, CloudFront) | `agent_run(name: "deployinfra")` |
| deployment | CI/CDデプロイ自動化Agent - Firebase/AWS自動デプロイ・ヘルスチェック・自動Rollback | `agent_run(name: "deployment")` |
| design-analyst-quintet | Design audit Pass 2 — 5 軸並列 analyst family agent (width-spacing / typography / color-contrast / radius-shadow / motion)。axis parametrize で 5 並列起動。community-platform 04a-04e 統合移植。 | `agent_run(name: "design-analyst-quintet")` |
| design-claude-design-brief-exporter | DCA SSOT (DESIGN.md modular) を Claude Design 用 prompt + asset bundle に変換し、外部 export する specialist agent。 | `agent_run(name: "design-claude-design-brief-exporter")` |
| design-claude-design-importer | Claude Design (claude.ai/design) の handoff bundle を import し、DCA Intent + Architecture layer の input に変換する specialist agent。 | `agent_run(name: "design-claude-design-importer")` |
| design-coherence-validator | E:Stack Axiom 2 (Coherence) を Intent → Architecture path_quality として定量評価する Architecture layer specialist agent。各 layer 間の意味整合性を validate。 | `agent_run(name: "design-coherence-validator")` |
| design-concept-planner | Research input から design intent / concept を立案する Intent layer specialist agent。Researcher 出力を受けて concept 草案 + 差別化軸を構成。 | `agent_run(name: "design-concept-planner")` |
| design-controller | Design lifecycle 全段階を E:Stack 3-layer (Intent → Architecture → Manifestation) に基づき統括する specialist agent。design society 動的編成 + DAG 構築 + 並列実行 + self-feedback loop 駆動 + DESIGN.md SSOT 整合性管理。 | `agent_run(name: "design-controller")` |
| design-figma-importer | Figma 公式 Remote MCP 経由で Figma Design file の structured context (frame / node / fill / text / variables) を取得し、DCA Intent + Architecture layer の input に変換する External (Inbound) specialist agent。 | `agent_run(name: "design-figma-importer")` |
| design-figma-token-syncer | DESIGN.md token module ↔ Figma Variables の bidirectional sync を行う Architecture layer specialist agent。diff 検出 → DesignImprover 連動で SSOT update PR-style change set を生成。 | `agent_run(name: "design-figma-token-syncer")` |
| design-fix-plan | Design audit Pass 3 — 5 axis analyst findings を統合し、優先度付き fix plan + REPORT.md を生成する Manifestation layer specialist agent。community-platform 05 移植。 | `agent_run(name: "design-fix-plan")` |
| design-improver | SelfFeedback evaluation を input に SSOT module update + design 改善提案を生成する Cross-layer specialist agent。PR-style change set として DCA に提示。 | `agent_run(name: "design-improver")` |
| design-knowledge-recorder | DCA cycle 知見を decision / learning / postmortem / SSOT module / wiki に永続化する Cross-layer specialist agent。Knowledge record protocol 実行担当。 | `agent_run(name: "design-knowledge-recorder")` |
| design-philosophy-extractor | 既存 artifact (codebase / Figma / handoff bundle / brand 資料) から design philosophy を抽出する Intent layer specialist agent。Reverse Structure Inference (RSI mode) 担当。 | `agent_run(name: "design-philosophy-extractor")` |
| design-philosophy-researcher | Design philosophy / pattern / theory / 競合 artifact を web + repo + reference document から調査する Intent layer specialist agent。E:Stack Intent layer の input 確立担当。 | `agent_run(name: "design-philosophy-researcher")` |
| design-reviewer-orchestrator | Manifestation layer の 3 quality review (brand-compliance-check / frontend-design-suite quality / design-reviewer skill) を orchestrate する specialist agent。Conflict C2 解決 + C3 (Affect_i 暗黙依存) wrap 担当。 | `agent_run(name: "design-reviewer-orchestrator")` |
| design-section-architect | Page / view section 構造を設計し、layout grid + breakpoint + section taxonomy を Architecture layer artifact 化する specialist agent。 | `agent_run(name: "design-section-architect")` |
| design-section-detector | Design audit Pass 1.5 — page を section (hero / feature / cta / etc.) に分類し、破損 (broken / overlapping / inconsistent) を検出する Manifestation layer specialist agent。community-platform 03 移植。 | `agent_run(name: "design-section-detector")` |
| design-self-feedback-evaluator | DCA cycle 全体の Axiom 4 (Preservation) + Axiom 5 (Completeness) を定量評価する Cross-layer specialist agent。information_increment + reach_ratio を測定し、改善 cycle 駆動。 | `agent_run(name: "design-self-feedback-evaluator")` |
| design-snapshot | Design audit Pass 0 — 対象 URL の screens / DOM / CSS dump を取得する Manifestation layer specialist agent。community-platform 01-snapshot 移植。 | `agent_run(name: "design-snapshot")` |
| design-token-architect | Design tokens (color / typography / spacing / shadow / radius / motion) を設計し、`docs/design-ssot/02-architecture/tokens/*.md` module + design-system.yml に正規化する Architecture layer specialist agent。 | `agent_run(name: "design-token-architect")` |
| design-token-inventory | Design audit Pass 1 — DESIGN.md SSOT tokens vs 実装 (globals.css / Tailwind config / inline style) を比較し、conflict を検出する Manifestation layer specialist agent。community-platform 02-token-inventory 移植。 | `agent_run(name: "design-token-inventory")` |
| dev-observer | CDP直接制御による開発デバッグアシスタント。 統合ログ収集(server+browser+network)、自動スクリーンショット、 CLS検出、React Component Explorer、UI要素ビジュアル指定を提供。 | `agent_run(name: "dev-observer")` |
| devops | CI/CD設計・インフラ自動化・デプロイメント戦略Agent | `agent_run(name: "devops")` |
| docker-host-admin | Container host (gpuserver, AWS ECS host) operations specialist。 InfrastructureControllerAgent (基控) の society 配下。 Container lifecycle (start/stop/redeploy)、image cleanup、host-level monitoring。 | `agent_run(name: "docker-host-admin")` |
| documentation | ドキュメント生成・管理Agent - 自動ドキュメント生成・一貫性維持・多言語対応 | `agent_run(name: "documentation")` |
| frontend | UI/UX実装・コンポーネント設計・状態管理の専門Agent | `agent_run(name: "frontend")` |
| hitl | Human-In-The-Loop approval gate agent。Cross-controller の high-risk operation (production deploy, destructive cleanup, authority docs modification, capacity budget exceed) を user approval 経由で gate する。 Coordinator/Controller からの escalation を受け、structured approval prompt を提示。 | `agent_run(name: "hitl")` |
| incident | インシデント対応・根本原因分析・ポストモーテム作成Agent | `agent_run(name: "incident")` |
| infrastructure-controller | Infrastructure (server / container host / shared resources) を統括する Controller Agent。 cleanup operation を pre-inventory + snapshot で gate、capacity budget を enforce。 aws-agent, deploy-infra, docker-host-admin 3 specialist を society として lead。 WhisperC accidental deletion 事故 type を構造的に防止。 | `agent_run(name: "infrastructure-controller")` |
| intent-guard | 意図からずれる実装を未然に検出する常駐 guard agent。 | `agent_run(name: "intent-guard")` |
| issue | Issue分析・Label管理Agent - 組織設計原則57ラベル体系による自動分類 + 階層的Issue管理 | `agent_run(name: "issue")` |
| janitor | System-wide janitor specialist (broader than jj-janitor). Periodic maintenance: refs/jj/keep prune, .ccm leak cleanup, .pil-state event log rotate, mailbox stale message cleanup, authority-events journal retention enforcement, L0 snapshot retention. SessionStart cron-like meta agent。 | `agent_run(name: "janitor")` |
| jj-branch | branch 戦略 (dev/main split, hotfix path, backport), branch protection, ADR 整合の specialist agent | `agent_run(name: "jj-branch")` |
| jj-janitor | stale bookmark, refs/jj/keep periodic prune, lock file 検出, op log archive の Meta agent (workflow 外、SessionStart cron-like) | `agent_run(name: "jj-janitor")` |
| jj-ops | jj 日常 VCS 操作 (describe/commit/push/fetch/snapshot) を PIL pipeline 経由で標準化する specialist agent | `agent_run(name: "jj-ops")` |
| jj-snapshot | jj op log restore, snapshot 取得/管理, refs/jj/keep maintenance, 復旧 orchestrate の specialist agent | `agent_run(name: "jj-snapshot")` |
| lark-analytics-specialist | description: Larkエコシステムのデータ分析・ビジネスインテリジェンスエージェント。Baseデータを分析・トレンド把握・自動レポート化してインサイトに変換します。 | `agent_run(name: "lark-analytics-specialist")` |
| lark-approval-hr | description: Lark承認ワークフロー・HR運用エージェント。承認フロー、勤怠管理、採用・オンボーディングを専門的に実行します。 | `agent_run(name: "lark-approval-hr")` |
| lark-browser-admin | description: Lark管理コンソールをブラウザ経由で操作するエージェント。APIで不可能な管理設定、アプリ公開、権限設定を実行します。 | `agent_run(name: "lark-browser-admin")` |
| lark-enterprise-orchestrator | description: Lark上の複雑なマルチステップ業務プロセスを自動化するAIオーケストレーター。タスクを分解し、Base・IM・Docs・Calendarを横断して実行します。 | `agent_run(name: "lark-enterprise-orchestrator")` |
| lark-integration-bridge | description: Larkと外部システム間のインテグレーションブリッジエージェント。インテリジェントなエラーハンドリングとデータ変換によるクロスプラットフォームデータフローをオーケストレーションします。 | `agent_run(name: "lark-integration-bridge")` |
| lark-message-ops | description: Larkメッセージング運用エージェント。チャット管理、カード送信、バッチ通知、グループ設定を専門的に行います。 | `agent_run(name: "lark-message-ops")` |
| license-management | ライセンス管理専門Agent - LMC統合とライセンス検証システム | `agent_run(name: "license-management")` |
| licensemanagement | ライセンス管理専門Agent - LMC統合とライセンス検証システム | `agent_run(name: "licensemanagement")` |
| migration | マイグレーションスペシャリストAgent - データ移行・スキーマ変更・バージョンアップ・後方互換性 | `agent_run(name: "migration")` |
| monitoring | メトリクス収集・アラート設計・ログ分析・APM Agent | `agent_run(name: "monitoring")` |
| north-star | L0.5 North Star Meta-Agent — maintains long-term goal vector across sessions, computes drift score per PR/Issue, escalates advisory to Coordinator on 3+ consecutive drift. Advisory-only authority (諫言権限). | `agent_run(name: "north-star")` |
| omega-guard | 不変条件(IC-1〜IC-5)の違反を検出するメタエージェント。 ワークフロー外で独立動作し、θ₁/θ₃/θ₅のゲートポイントで起動する。 任意のSurface(CLI/WebUI/API/Agent出力)に適用可能。 | `agent_run(name: "omega-guard")` |
| optimization-agent | パフォーマンス・コード最適化Agent - リファクタリング・品質改善・技術的負債解消 | `agent_run(name: "optimization-agent")` |
| optimization | パフォーマンス・コード最適化Agent - リファクタリング・品質改善・技術的負債解消 | `agent_run(name: "optimization")` |
| performance | パフォーマンス最適化Agent - 性能測定・ボトルネック分析・最適化提案・負荷テスト | `agent_run(name: "performance")` |
| pipeline-controller | PIL パイプライン実行を統括する Controller Agent。pipeline_run 起動・pipeline_tail 監視・ known failure pattern (C1-C4) の deterministic recovery・post-run summary 生成を担当。 novel pattern は CoordinatorAgent にエスカレーションする。Epic | `agent_run(name: "pipeline-controller")` |
| pr | Pull Request自動作成Agent - Conventional Commits準拠・Draft PR自動生成 | `agent_run(name: "pr")` |
| qa | 品質保証・テスト自動化Agent - テスト戦略策定・E2Eテスト設計・品質メトリクス分析 | `agent_run(name: "qa")` |
| refactor | リファクタリングスペシャリストAgent - コード品質改善・技術的負債解消・設計パターン適用 | `agent_run(name: "refactor")` |
| refresher | Issue状態監視・自動更新Agent - 常にプロジェクトステータスを最新に保つ | `agent_run(name: "refresher")` |
| release | SDKリリース統括Agent — ビルド・検証・RQT・S3アップロード・E2Eテストの全フローを自律実行 | `agent_run(name: "release")` |
| review | コード品質判定Agent - 静的解析・セキュリティスキャン・品質スコアリング・不変条件検証(IC-1〜IC-5) | `agent_run(name: "review")` |
| rust-migration | TypeScript→Rust移行専門Agent - 安全なRust移行とNAPIバインディング生成 | `agent_run(name: "rust-migration")` |
| rustmigration | TypeScript→Rust移行専門Agent - 安全なRust移行とNAPIバインディング生成 | `agent_run(name: "rustmigration")` |
| sd-analyze | | | `agent_run(name: "sd-analyze")` |
| sd-generate | | | `agent_run(name: "sd-generate")` |
| sd-research | | | `agent_run(name: "sd-research")` |
| security-learner-agent | セキュリティインシデントから新パターンを学習し、検出ルールを自己進化させる | `agent_run(name: "security-learner-agent")` |
| security-planner-agent | APIルート設計時にセキュリティ要件を推論し、テンプレート・テストを生成する | `agent_run(name: "security-planner-agent")` |
| security-scanner-agent | コードレベルのセキュリティ欠陥を検出・分類する防御スキャナー | `agent_run(name: "security-scanner-agent")` |
| security | Webサービス全体セキュリティ統括CSO - E2Eセキュリティ責任 [Workflow θ₄] | `agent_run(name: "security")` |
| test | テスト自動実行Agent - ユニットテスト、統合テスト、E2Eテストを自動実行し、カバレッジレポートを生成 | `agent_run(name: "test")` |
| threejs | Three.js 3Dシーン構築・レンダリング・コード生成の専門Agent。 E:Stack Theory (Intent→Architecture→Manifestation) に基づく デザイン品質保証。R3F/vanilla 両対応、headlessレンダリング対応。 | `agent_run(name: "threejs")` |
| tmux-control | Tmux Control Agent - tmuxセッション制御・マルチペイン管理 | `agent_run(name: "tmux-control")` |
| tmuxcontrol | Tmux Control Agent - tmuxセッション制御・マルチペイン管理 | `agent_run(name: "tmuxcontrol")` |
| ux-review | ユーザー視点でUI/UXを分析し、カスタマージャーニーに基づく改善提案を行う | `agent_run(name: "ux-review")` |
| uxreview | ユーザー視点でUI/UXを分析し、カスタマージャーニーに基づく改善提案を行う | `agent_run(name: "uxreview")` |
| vcs-controller | VCS (jj/git) 操作を統括する Controller Agent。jj parallel workspace の destructive op を invariant matrix で事前 gate、未 describe 中の edits を auto-snapshot、recovery を pipeline で orchestrate。jj-{ops, branch, snapshot, janitor} 4 specialist を society として lead。既存の jj-* hooks 群と PIL pipeline を活用 (既設計済み)。 | `agent_run(name: "vcs-controller")` |
| wiring-maintenance | 4-way wiring graph (SSOT yaml / generated .claude/ / plan / Issue body / code) を自動構築・drift 検出・cascade repair PR 作成する L0.5 advisory agent。 background true、HITL gate, NEVER auto-merge。 | `agent_run(name: "wiring-maintenance")` |
| xkoma-agent | Xkoma AI Agent MCP Server との連携エージェント。 セッション管理、メモリ、キュー、セキュリティ監査を提供。 | `agent_run(name: "xkoma-agent")` |

---
*Generated by CCAGI SDK*
