import { Button } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { FiGlobe } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const langLabel: Record<string, string> = {
    en: "EN",
    fr: "FR",
    ht: "HT",
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant="ghost" color="blue.300" size="sm" gap={2}>
          <FiGlobe />
          {langLabel[i18n.language] ?? i18n.language.toUpperCase().substring(0, 2)}
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem value="en" onClick={() => changeLanguage("en")}>
          🇺🇸 {t("common.english")}
        </MenuItem>
        <MenuItem value="fr" onClick={() => changeLanguage("fr")}>
          🇫🇷 {t("common.french")}
        </MenuItem>
        <MenuItem value="ht" onClick={() => changeLanguage("ht")}>
          🇭🇹 {t("common.haitian_creole")}
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}

export default LanguageSwitcher
