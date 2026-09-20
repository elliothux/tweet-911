import {
  Background,
  Card,
  Cursor,
  Divider,
  Radio,
  Title,
} from "animal-island-ui";
import { useEffect, useState } from "react";
import {
  blockModeItem,
  blockPostThresholdItem,
  blockReplyThresholdItem,
  getBlockSettings,
  hydrateLanguage,
  languageItem,
  OPEN_COMPUTE_URL,
  SOURCE_REPO_URL,
  type BlockMode,
  type BlockThreshold,
} from "../../lib/config";
import {
  LANGUAGE_OPTIONS,
  localeTag,
  setLanguageSetting,
  subscribeI18n,
  t,
  type LanguageSetting,
} from "../../lib/i18n";
import {
  statsItem,
  viewStats,
  type ScanStatsView,
} from "../../lib/stats";
import meme from "./meme.gif";

export function App() {
  const [language, setLanguage] = useState<LanguageSetting>("auto");
  const [blockMode, setBlockMode] = useState<BlockMode>("off");
  const [postThreshold, setPostThreshold] = useState<BlockThreshold>("high");
  const [replyThreshold, setReplyThreshold] = useState<BlockThreshold>("high");
  const [stats, setStats] = useState<ScanStatsView>({ total: 0, today: 0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    void Promise.all([
      hydrateLanguage(),
      getBlockSettings(),
      statsItem.getValue(),
    ]).then(([lang, block, stored]) => {
      setLanguage(lang);
      setBlockMode(block.mode);
      setPostThreshold(block.postThreshold);
      setReplyThreshold(block.replyThreshold);
      setStats(viewStats(stored));
    });
    const unwatchStats = statsItem.watch((value) => {
      setStats(viewStats(value));
    });
    const unwatchI18n = subscribeI18n(() => setTick((n) => n + 1));
    return () => {
      unwatchStats();
      unwatchI18n();
    };
  }, []);

  async function onLanguage(value: string | number) {
    const next = value as LanguageSetting;
    setLanguage(next);
    setLanguageSetting(next);
    await languageItem.setValue(next);
  }

  function openLink(url: string) {
    void browser.tabs.create({ url });
  }

  return (
    <Cursor>
      <Background type="default" style={{ padding: 16 }}>
        <Title size="small">{t("app.name")}</Title>
        <Divider type="dashed-brown" />
        <div className="popup-stats">
          <Card color="app-teal">
            <p className="popup-stat-label">{t("popup.stats.total")}</p>
            <p className="popup-stat-value">
              {formatCount(stats.total)}
              <span className="popup-stat-unit">{t("popup.stats.unit")}</span>
            </p>
          </Card>
          <Card color="app-yellow">
            <p className="popup-stat-label">{t("popup.stats.today")}</p>
            <p className="popup-stat-value">
              {formatCount(stats.today)}
              <span className="popup-stat-unit">{t("popup.stats.unit")}</span>
            </p>
          </Card>
        </div>
        <Card>
          <p
            style={{
              color: "var(--animal-text-color)",
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            {t("options.language")}
          </p>
          <Radio
            value={language}
            onChange={onLanguage}
            options={LANGUAGE_OPTIONS.map((opt) => ({
              label: t(opt.labelKey),
              value: opt.value,
            }))}
          />

          <p
            style={{
              color: "var(--animal-text-color)",
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            {t("options.block")}
          </p>
          <Radio
            value={blockMode}
            onChange={(value) => {
              const next = value as BlockMode;
              setBlockMode(next);
              void blockModeItem.setValue(next);
            }}
            options={[
              { label: t("options.block.off"), value: "off" },
              { label: t("options.block.blur"), value: "blur" },
              { label: t("options.block.hide"), value: "hide" },
            ]}
          />
          <p
            style={{
              color: "var(--animal-text-color)",
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {t("options.block.hint")}
          </p>

          <p
            style={{
              color: "var(--animal-text-color)",
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            {t("options.threshold.post")}
          </p>
          <Radio
            value={postThreshold}
            onChange={(value) => {
              const next = value as BlockThreshold;
              setPostThreshold(next);
              void blockPostThresholdItem.setValue(next);
            }}
            options={[
              { label: t("options.threshold.mid"), value: "mid" },
              { label: t("options.threshold.high"), value: "high" },
            ]}
          />

          <p
            style={{
              color: "var(--animal-text-color)",
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            {t("options.threshold.reply")}
          </p>
          <Radio
            value={replyThreshold}
            onChange={(value) => {
              const next = value as BlockThreshold;
              setReplyThreshold(next);
              void blockReplyThresholdItem.setValue(next);
            }}
            options={[
              { label: t("options.threshold.mid"), value: "mid" },
              { label: t("options.threshold.high"), value: "high" },
            ]}
          />

          <div className="popup-links">
            <a
              href={SOURCE_REPO_URL}
              onClick={(e) => {
                e.preventDefault();
                openLink(SOURCE_REPO_URL);
              }}
            >
              {t("options.source")}
            </a>
            <a
              href={OPEN_COMPUTE_URL}
              onClick={(e) => {
                e.preventDefault();
                openLink(OPEN_COMPUTE_URL);
              }}
            >
              {t("popover.powered")}
            </a>
          </div>

          <img className="popup-meme" src={meme} alt="" />
        </Card>
      </Background>
    </Cursor>
  );
}

function formatCount(n: number) {
  return n.toLocaleString(localeTag());
}
