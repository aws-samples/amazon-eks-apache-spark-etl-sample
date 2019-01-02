name := "spark-on-eks"

version := "v1"

scalaVersion := "2.11.12"

resolvers += "Typesafe Repository" at "http://repo.typesafe.com/typesafe/releases/"

// additional librairies
libraryDependencies ++= {
  Seq(
    "org.apache.spark" %% "spark-core" % "2.4.3" % "provided",
    "org.apache.spark" %% "spark-sql" % "2.4.3" % "provided",
    "org.apache.hadoop" % "hadoop-aws" % "2.7.1",
    "com.amazonaws" % "aws-java-sdk" % "1.7.4",
    "com.holdenkarau" %% "spark-testing-base" % "2.4.3_0.12.0" % Test,
    "org.scalactic" %% "scalactic" % "3.0.7",
    "org.scalatest" %% "scalatest" % "3.0.7" % Test
  )
}

assemblyShadeRules in assembly := Seq(
  ShadeRule.rename("org.apache.commons.beanutils.**" -> "shaded-commons.beanutils.@1").inLibrary("commons-beanutils" % "commons-beanutils-core" % "1.8.0"),
  ShadeRule.rename("org.apache.commons.collections.**" -> "shaded-commons.collections.@1").inLibrary("commons-beanutils" % "commons-beanutils-core" % "1.8.0"),
  ShadeRule.rename("org.apache.commons.collections.**" -> "shaded-commons2.collections.@1").inLibrary("commons-beanutils" % "commons-beanutils" % "1.7.0"),
)

// testing configuration for Spark-testing-base package
fork in Test := true
javaOptions ++= Seq("-Xms512M", "-Xmx2048M", "-XX:MaxPermSize=2048M", "-XX:+CMSClassUnloadingEnabled")
parallelExecution in Test := false